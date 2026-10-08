import { postQrItems } from './api';
import { readItems, writeItems } from '../storage/qrStorage';
import type { QrItem } from '../types/qrItem';
import { serial } from '../utils/serial';

/**
 * Uploads pending and failed records. Synced rows are not sent again.
 * Successful rows are marked synced and kept locally. A failed request
 * leaves existing rows in place.
 */
export function syncPendingRecords(): Promise<QrItem[]> {
  return serial(async () => {
    const current = await readItems();
    const queue = current.filter(
      (item) => item.syncStatus === 'pending' || item.syncStatus === 'failed',
    );

    if (queue.length === 0) return current;

    try {
      const result = await postQrItems(
        queue.map((item) => ({
          id: item.id,
          qrCode: item.qrCode,
          scannedAt: item.scannedAt,
        })),
      );

      const syncedIds = new Set(result.syncedIds);
      const failedIds = new Set(result.failedIds);

      const next = current.map((item) => {
        if (syncedIds.has(item.id)) return { ...item, syncStatus: 'synced' as const };
        if (failedIds.has(item.id)) return { ...item, syncStatus: 'failed' as const };
        return item;
      });

      await writeItems(next);
      return next;
    } catch {
      return current;
    }
  });
}
