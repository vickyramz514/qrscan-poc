import AsyncStorage from '@react-native-async-storage/async-storage';

import type { QrItem, SyncStatus } from '../types/qrItem';
import { serial } from '../utils/serial';

const STORAGE_KEY = 'qrscan.items.v1';

const SYNC_STATUSES: SyncStatus[] = ['pending', 'synced', 'failed'];

function isQrItem(value: unknown): value is QrItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as QrItem;
  return (
    typeof item.id === 'string' &&
    typeof item.qrCode === 'string' &&
    typeof item.scannedAt === 'string' &&
    SYNC_STATUSES.includes(item.syncStatus)
  );
}

export async function readItems(): Promise<QrItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQrItem).sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
  } catch {
    return [];
  }
}

export async function writeItems(items: QrItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function mergeRecords(existing: QrItem[], incoming: QrItem[]): QrItem[] {
  const byId = new Map(existing.map((item) => [item.id, item]));

  for (const item of incoming) {
    const previous = byId.get(item.id);
    if (previous?.syncStatus === 'synced') {
      byId.set(item.id, { ...item, syncStatus: 'synced' });
      continue;
    }
    byId.set(item.id, item);
  }

  return Array.from(byId.values()).sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
}

/** Upsert scanned records. Previously saved rows that are not in `incoming` are kept. */
export function saveItems(incoming: QrItem[]): Promise<QrItem[]> {
  return serial(async () => {
    const existing = await readItems();
    const merged = mergeRecords(existing, incoming);
    await writeItems(merged);
    return merged;
  });
}

export function clearStoredItems(): Promise<void> {
  return serial(() => writeItems([]));
}
