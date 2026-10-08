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
import { AppState } from 'react-native';

import { syncPendingRecords } from '../services/syncService';
import { clearStoredItems, readItems, saveItems } from '../storage/qrStorage';
import type { QrItem } from '../types/qrItem';
import { createId } from '../utils/id';
import { applyStoredStatuses } from '../utils/items';
import { isOnlineState } from '../utils/network';

type ScanResult = 'added' | 'duplicate' | 'ignored';

type QrItemsContextValue = {
  items: QrItem[];
  ready: boolean;
  isOnline: boolean;
  notice: string | null;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  saving: boolean;
  addScan: (qrCode: string) => ScanResult;
  save: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const QrItemsContext = createContext<QrItemsContextValue | null>(null);

export function QrItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QrItem[]>([]);
  const [ready, setReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeId, setNoticeId] = useState(0);
  const [saving, setSaving] = useState(false);

  const itemsRef = useRef<QrItem[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);
  const lastFrameRef = useRef({ code: '', at: 0 });

  itemsRef.current = items;

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    setNoticeId((id) => id + 1);
  }, []);

  const runSync = useCallback(async () => {
    if (!readyRef.current) return;

    const state = await NetInfo.fetch();
    const online = isOnlineState(state);
    setIsOnline(online);
    if (!online) return;

    const stored = await syncPendingRecords();
    setItems((prev) => applyStoredStatuses(prev, stored));
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [stored, net] = await Promise.all([readItems(), NetInfo.fetch()]);
      if (cancelled) return;

      seenRef.current = new Set(stored.map((item) => item.qrCode));
      setItems(stored);
      setIsOnline(isOnlineState(net));
      readyRef.current = true;
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(isOnlineState(state));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!ready || !isOnline) return;
    void runSync();
  }, [ready, isOnline, runSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void runSync();
    });
    return () => subscription.remove();
  }, [runSync]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timeout);
  }, [notice, noticeId]);

  const addScan = useCallback((qrCode: string): ScanResult => {
    const value = qrCode.trim();
    if (!readyRef.current || !value) return 'ignored';

    const now = Date.now();
    const last = lastFrameRef.current;
    // Later frames of a code still in view are not a new scan.
    const stillInFrame = last.code === value && now - last.at < 1500;
    lastFrameRef.current = { code: value, at: now };

    if (seenRef.current.has(value)) {
      return stillInFrame ? 'ignored' : 'duplicate';
    }

    seenRef.current.add(value);

    const item: QrItem = {
      id: createId(),
      qrCode: value,
      scannedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    setItems((prev) => [...prev, item]);
    return 'added';
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const merged = await saveItems(itemsRef.current);
      setItems((prev) => applyStoredStatuses(prev, merged));
      showNotice('Saved locally');
      void runSync();
    } catch {
      showNotice('Could not save');
    } finally {
      setSaving(false);
    }
  }, [runSync, showNotice]);

  const clearAll = useCallback(async () => {
    seenRef.current = new Set();
    setItems([]);
    try {
      await clearStoredItems();
      showNotice('Cleared');
    } catch {
      showNotice('Could not clear saved records');
    }
  }, [showNotice]);

  const value = useMemo<QrItemsContextValue>(() => {
    let pendingCount = 0;
    let syncedCount = 0;
    let failedCount = 0;

    for (const item of items) {
      if (item.syncStatus === 'pending') pendingCount += 1;
      else if (item.syncStatus === 'synced') syncedCount += 1;
      else failedCount += 1;
    }

    return {
      items,
      ready,
      isOnline,
      notice,
      pendingCount,
      syncedCount,
      failedCount,
      saving,
      addScan,
      save,
      clearAll,
    };
  }, [
    items,
    ready,
    isOnline,
    notice,
    saving,
    addScan,
    save,
    clearAll,
  ]);

  return <QrItemsContext.Provider value={value}>{children}</QrItemsContext.Provider>;
}

export function useQrItems(): QrItemsContextValue {
  const value = useContext(QrItemsContext);
  if (!value) {
    throw new Error('useQrItems must be used within QrItemsProvider');
  }
  return value;
}
