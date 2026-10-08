import NetInfo from '@react-native-community/netinfo';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { SCAN_DEBOUNCE_MS } from '../services/config';
import { ApiError } from '../src/api/client';
import {
  clearScans,
  getDeviceScanHistory,
  initializeDevice,
  submitScan,
  toScanType,
} from '../src/api/scannerApi';
import { loadDeviceId } from '../storage/deviceId';
import type { ClientScanStatus, Scan, ScanListItem } from '../types/api';
import { currentAppVersion, currentPlatform } from '../utils/deviceInfo';
import { isOnlineState } from '../utils/network';
import { createScanLock } from '../utils/scanLock';

type NoticeTone = 'success' | 'error';

type Notice = {
  message: string;
  tone: NoticeTone;
  id: number;
};

type DetectedCode = {
  code: string;
  scannerType: string;
};

type ScanResult = 'added' | 'ignored' | 'duplicate';

type QrItemsContextValue = {
  items: ScanListItem[];
  ready: boolean;
  isOnline: boolean;
  notice: Notice | null;
  localCount: number;
  syncingCount: number;
  syncedCount: number;
  failedCount: number;
  saving: boolean;
  refreshing: boolean;
  syncing: boolean;
  addScan: (detection: DetectedCode) => ScanResult;
  save: () => Promise<void>;
  refresh: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const QrItemsContext = createContext<QrItemsContextValue | null>(null);

const scanLock = createScanLock(SCAN_DEBOUNCE_MS);
let registrationPromise: Promise<void> | null = null;
let historyStarted = false;

function ensureDeviceRegistered(deviceId: string): Promise<void> {
  if (!registrationPromise) {
    registrationPromise = initializeDevice({
      deviceId,
      platform: currentPlatform(),
      appVersion: currentAppVersion(),
    }).catch((error: unknown) => {
      registrationPromise = null;
      throw error;
    });
  }

  return registrationPromise;
}

function isTransientNetworkError(error: unknown): boolean {
  if (error instanceof ApiError && error.status !== undefined && error.status < 500) return false;
  const message = (error instanceof Error ? error.message : '').toLowerCase();
  return (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('fetch failed') ||
    message.includes('could not connect') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('offline') ||
    message.includes('aborted')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function QrItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ScanListItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const itemsRef = useRef<ScanListItem[]>([]);
  const deviceIdRef = useRef<string | null>(null);
  const noticeIdRef = useRef(0);
  const isOnlineRef = useRef(false);
  const sawNetworkRef = useRef(false);
  const syncingRef = useRef(false);
  const followUpRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());
  /** Codes already stored for this device, including rows cleared from the screen. */
  const knownCodesRef = useRef<Set<string>>(new Set());

  itemsRef.current = items;

  const showNotice = useCallback((message: string, tone: NoticeTone) => {
    noticeIdRef.current += 1;
    setNotice({ message, tone, id: noticeIdRef.current });
  }, []);

  const applyHistory = useCallback((history: { scans: Scan[]; codes: string[] }) => {
    for (const code of history.codes) knownCodesRef.current.add(code);
    setItems((current) => mergeServerScans(current, history.scans));
  }, []);

  const syncPendingRef = useRef<() => Promise<void>>(async () => undefined);

  const scheduleFollowUp = useCallback(() => {
    if (!isOnlineRef.current || followUpRef.current >= 4) return;
    followUpRef.current += 1;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      void syncPendingRef.current();
    }, 1200);
  }, []);

  const submitInBackground = useCallback(
    (item: ScanListItem) => {
      if (!isOnlineRef.current) return;
      void retryScan(
        item,
        deviceIdRef,
        knownCodesRef,
        inFlightRef,
        isOnlineRef,
        setItems,
        showNotice,
      ).then((result) => {
        if (result === 'waiting' && isOnlineRef.current) scheduleFollowUp();
      });
    },
    [scheduleFollowUp, showNotice],
  );

  const syncPending = useCallback(async () => {
    if (syncingRef.current || !isOnlineRef.current) return;

    const pending = itemsRef.current.filter(
      (item) =>
        (item.clientStatus === 'failed' ||
          item.clientStatus === 'local' ||
          item.clientStatus === 'syncing') &&
        !inFlightRef.current.has(item.listKey),
    );
    if (pending.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);
    const pendingKeys = new Set(pending.map((item) => item.listKey));
    setItems((current) =>
      current.map((item) =>
        pendingKeys.has(item.listKey) ? { ...item, clientStatus: 'syncing' } : item,
      ),
    );

    try {
      let stillWaiting = false;
      for (const item of pending) {
        const result = await retryScan(
          item,
          deviceIdRef,
          knownCodesRef,
          inFlightRef,
          isOnlineRef,
          setItems,
          showNotice,
        );
        if (result === 'waiting') stillWaiting = true;
        if (!isOnlineRef.current) break;
      }
      if (stillWaiting && isOnlineRef.current) {
        if (followUpRef.current < 4) scheduleFollowUp();
        else showNotice("Couldn't sync yet. Saved on this phone.", 'error');
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [scheduleFollowUp, showNotice]);

  syncPendingRef.current = syncPending;

  useEffect(() => {
    let active = true;

    void loadDeviceId()
      .then((deviceId) => {
        deviceIdRef.current = deviceId;
        if (active) setReady(true);

        if (!historyStarted) {
          historyStarted = true;
          void ensureDeviceRegistered(deviceId)
            .then(() => getDeviceScanHistory(deviceId))
            .then((history) => {
              if (!active) return;
              applyHistory(history);
            })
            .catch((error) => {
              historyStarted = false;
              console.warn('[scanner] getDeviceScanHistory failed', error);
            });
        }
      })
      .catch((error) => {
        console.warn('[scanner] device id failed', error);
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [applyHistory]);

  const reloadHistory = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const deviceId = deviceIdRef.current ?? (await loadDeviceId());
        deviceIdRef.current = deviceId;
        await ensureDeviceRegistered(deviceId);
        applyHistory(await getDeviceScanHistory(deviceId));
        historyStarted = true;
        return;
      } catch (error) {
        historyStarted = false;
        if (attempt < 2 && isOnlineRef.current && isTransientNetworkError(error)) {
          await delay(800 * (attempt + 1));
          continue;
        }
        console.warn('[scanner] getDeviceScanHistory failed', error);
      }
    }
  }, [applyHistory]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = isOnlineState(state);
      const previous = isOnlineRef.current;
      const first = !sawNetworkRef.current;
      sawNetworkRef.current = true;
      isOnlineRef.current = online;
      setIsOnline(online);
      if (!online) {
        followUpRef.current = 0;
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        return;
      }
      if (!first && !previous) {
        followUpRef.current = 0;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          void syncPending();
          void reloadHistory();
        }, 700);
      }
    });
    return () => {
      unsubscribe();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [syncPending, reloadHistory]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const addScan = useCallback(
    (detection: DetectedCode): ScanResult => {
      const code = detection.code.trim();
      if (!code || !scanLock.tryAccept(code)) return 'ignored';

      const alreadyListed = itemsRef.current.some((item) => item.code === code);
      if (alreadyListed || knownCodesRef.current.has(code)) return 'duplicate';

      const online = isOnlineRef.current;
      const listKey = createListKey();
      const item: ScanListItem = {
        listKey,
        id: listKey,
        deviceId: deviceIdRef.current ?? '',
        code,
        type: toScanType(detection.scannerType),
        status: online ? 'syncing' : 'local',
        createdAt: new Date().toISOString(),
        clientStatus: online ? 'syncing' : 'local',
      };

      setItems((current) => [...current, item]);
      if (online) submitInBackground(item);
      return 'added';
    },
    [submitInBackground],
  );

  const save = useCallback(async () => {
    const failed = itemsRef.current.filter(
      (item) => item.clientStatus === 'failed' || item.clientStatus === 'local',
    );
    if (failed.length === 0) {
      showNotice('Synced', 'success');
      return;
    }

    setSaving(true);
    setItems((current) =>
      current.map((item) =>
        item.clientStatus === 'failed' || item.clientStatus === 'local'
          ? { ...item, clientStatus: 'syncing' }
          : item,
      ),
    );

    await Promise.all(
      failed.map((item) =>
        retryScan(item, deviceIdRef, knownCodesRef, inFlightRef, isOnlineRef, setItems, showNotice),
      ),
    );
    setSaving(false);
  }, [showNotice]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const deviceId = deviceIdRef.current ?? (await loadDeviceId());
      deviceIdRef.current = deviceId;
      await ensureDeviceRegistered(deviceId);
      applyHistory(await getDeviceScanHistory(deviceId));
    } catch (error) {
      console.warn('[scanner] refresh failed', error);
      showNotice(error instanceof ApiError ? error.message : "Couldn't refresh scans", 'error');
    } finally {
      setRefreshing(false);
    }
  }, [applyHistory, showNotice]);

  const clearAll = useCallback(async () => {
    try {
      await clearScans();
      knownCodesRef.current.clear();
      setItems([]);
      showNotice('Cleared', 'success');
    } catch (error) {
      console.warn('[scanner] clear failed', error);
      showNotice(error instanceof ApiError ? error.message : "Couldn't clear scans", 'error');
    }
  }, [showNotice]);

  const value = useMemo<QrItemsContextValue>(() => {
    let localCount = 0;
    let syncingCount = 0;
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of items) {
      if (item.clientStatus === 'local') localCount += 1;
      else if (item.clientStatus === 'syncing') syncingCount += 1;
      else if (item.clientStatus === 'synced') syncedCount += 1;
      else failedCount += 1;
    }

    return {
      items,
      ready,
      isOnline,
      notice,
      localCount,
      syncingCount,
      syncedCount,
      failedCount,
      saving,
      refreshing,
      syncing,
      addScan,
      save,
      refresh,
      clearAll,
    };
  }, [items, ready, isOnline, notice, saving, refreshing, syncing, addScan, save, refresh, clearAll]);

  return <QrItemsContext.Provider value={value}>{children}</QrItemsContext.Provider>;
}

export function useQrItems(): QrItemsContextValue {
  const value = useContext(QrItemsContext);
  if (!value) {
    throw new Error('useQrItems must be used within QrItemsProvider');
  }
  return value;
}

type RetryOutcome = 'synced' | 'waiting' | 'failed' | 'skipped';

const NETWORK_RETRY_DELAYS_MS = [700, 1500, 2500];

async function retryScan(
  item: ScanListItem,
  deviceIdRef: { current: string | null },
  knownCodesRef: { current: Set<string> },
  inFlightRef: { current: Set<string> },
  isOnlineRef: { current: boolean },
  setItems: (update: (current: ScanListItem[]) => ScanListItem[]) => void,
  showNotice: (message: string, tone: 'success' | 'error') => void,
): Promise<RetryOutcome> {
  if (inFlightRef.current.has(item.listKey)) return 'skipped';
  inFlightRef.current.add(item.listKey);

  const keepLocal = () => {
    setItems((current) =>
      current.map((row) =>
        row.listKey === item.listKey ? { ...row, clientStatus: 'local' as const } : row,
      ),
    );
  };

  try {
    for (let attempt = 0; attempt <= NETWORK_RETRY_DELAYS_MS.length; attempt += 1) {
      if (!isOnlineRef.current) {
        keepLocal();
        return 'waiting';
      }

      try {
        const deviceId = deviceIdRef.current ?? (await loadDeviceId());
        deviceIdRef.current = deviceId;
        await ensureDeviceRegistered(deviceId);
        if (knownCodesRef.current.has(item.code)) {
          setItems((current) => current.filter((row) => row.listKey !== item.listKey));
          showNotice('This code already exists', 'error');
          return 'skipped';
        }
        const saved = await submitScan({
          deviceId,
          code: item.code,
          type: item.type,
        });
        knownCodesRef.current.add(item.code);
        setItems((current) =>
          current.map((row) =>
            row.listKey === item.listKey
              ? {
                  ...row,
                  id: saved.id || row.id,
                  deviceId,
                  status: saved.status || 'saved',
                  createdAt: saved.createdAt || row.createdAt,
                  clientStatus: 'synced' as const,
                }
              : row,
          ),
        );
        return 'synced';
      } catch (error) {
        const retryable = !isOnlineRef.current || isTransientNetworkError(error);
        if (retryable && attempt < NETWORK_RETRY_DELAYS_MS.length && isOnlineRef.current) {
          await delay(NETWORK_RETRY_DELAYS_MS[attempt] ?? 700);
          continue;
        }
        if (retryable) {
          keepLocal();
          return 'waiting';
        }
        console.warn('[scanner] retry failed', error);
        setItems((current) =>
          current.map((row) =>
            row.listKey === item.listKey ? { ...row, clientStatus: 'failed' as const } : row,
          ),
        );
        showNotice(error instanceof ApiError ? error.message : "Couldn't save scan", 'error');
        return 'failed';
      }
    }

    keepLocal();
    return 'waiting';
  } finally {
    inFlightRef.current.delete(item.listKey);
  }
}

function mergeServerScans(local: ScanListItem[], remote: Scan[]): ScanListItem[] {
  const remoteItems = remote.map(serverScanToListItem);
  const remoteIds = new Set(remoteItems.map((item) => item.id).filter(Boolean));
  const remoteCodes = new Set(remoteItems.map((item) => item.code));
  const pendingLocal = local.filter(
    (item) => (!item.id || !remoteIds.has(item.id)) && !remoteCodes.has(item.code),
  );
  return [...remoteItems, ...pendingLocal].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function serverScanToListItem(scan: Scan): ScanListItem {
  const id = scan.id || `${scan.code}-${scan.createdAt}`;
  return {
    listKey: id,
    id,
    deviceId: scan.deviceId,
    code: scan.code,
    type: scan.type,
    status: scan.status,
    createdAt: scan.createdAt,
    clientStatus: statusFromServer(scan.status),
  };
}

function statusFromServer(status: string): ClientScanStatus {
  const normalized = status.toLowerCase();
  if (normalized === 'failed' || normalized === 'error') return 'failed';
  if (normalized === 'syncing' || normalized === 'pending') return 'syncing';
  if (normalized === 'local') return 'local';
  return 'synced';
}

function createListKey(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
