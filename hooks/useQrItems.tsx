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
  clearAll: () => void;
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
      );
    },
    [showNotice],
  );

  const syncPending = useCallback(async () => {
    if (syncingRef.current || !isOnlineRef.current) return;

    const pending = itemsRef.current.filter(
      (item) =>
        (item.clientStatus === 'failed' || item.clientStatus === 'local') &&
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
      await Promise.all(
        pending.map((item) =>
          retryScan(item, deviceIdRef, knownCodesRef, inFlightRef, isOnlineRef, setItems, showNotice),
        ),
      );
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [showNotice]);

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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = isOnlineState(state);
      const previous = isOnlineRef.current;
      const first = !sawNetworkRef.current;
      sawNetworkRef.current = true;
      isOnlineRef.current = online;
      setIsOnline(online);
      if (online && (first || !previous)) {
        void syncPending();
      }
    });
    return unsubscribe;
  }, [syncPending]);

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

  const clearAll = useCallback(() => {
    setItems([]);
    showNotice('Cleared', 'success');
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

async function retryScan(
  item: ScanListItem,
  deviceIdRef: { current: string | null },
  knownCodesRef: { current: Set<string> },
  inFlightRef: { current: Set<string> },
  isOnlineRef: { current: boolean },
  setItems: (update: (current: ScanListItem[]) => ScanListItem[]) => void,
  showNotice: (message: string, tone: 'success' | 'error') => void,
): Promise<void> {
  if (inFlightRef.current.has(item.listKey)) return;
  inFlightRef.current.add(item.listKey);

  try {
    const deviceId = deviceIdRef.current ?? (await loadDeviceId());
    deviceIdRef.current = deviceId;
    await ensureDeviceRegistered(deviceId);
    if (knownCodesRef.current.has(item.code)) {
      setItems((current) => current.filter((row) => row.listKey !== item.listKey));
      showNotice('This code already exists', 'error');
      return;
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
  } catch (error) {
    if (!isOnlineRef.current) {
      setItems((current) =>
        current.map((row) =>
          row.listKey === item.listKey ? { ...row, clientStatus: 'local' as const } : row,
        ),
      );
      return;
    }
    console.warn('[scanner] retry failed', error);
    setItems((current) =>
      current.map((row) =>
        row.listKey === item.listKey ? { ...row, clientStatus: 'failed' as const } : row,
      ),
    );
    showNotice(error instanceof ApiError ? error.message : "Couldn't save scan", 'error');
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
