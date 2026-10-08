import type { QrItem } from '../types/qrItem';

/** Copy sync status from storage onto the in-memory list without dropping unsaved scans. */
export function applyStoredStatuses(memory: QrItem[], stored: QrItem[]): QrItem[] {
  const storedById = new Map(stored.map((item) => [item.id, item]));
  let changed = false;

  const next = memory.map((item) => {
    const saved = storedById.get(item.id);
    if (!saved || saved.syncStatus === item.syncStatus) return item;
    changed = true;
    return { ...item, syncStatus: saved.syncStatus };
  });

  return changed ? next : memory;
}
