import { StyleSheet, Text, View } from 'react-native';

import type { QrItem, SyncStatus } from '../types/qrItem';
import { formatScanTime } from '../utils/formatTime';

const STATUS_LABEL: Record<SyncStatus, string> = {
  pending: 'Pending',
  synced: 'Synced',
  failed: 'Failed',
};

type ScannedItemRowProps = {
  item: QrItem;
  highlight?: boolean;
};

export function ScannedItemRow({ item, highlight = false }: ScannedItemRowProps) {
  return (
    <View style={[styles.row, highlight && styles.highlight]}>
      <View style={styles.copy}>
        <Text style={styles.code} numberOfLines={1}>
          {item.qrCode}
        </Text>
        <Text style={styles.time}>{formatScanTime(item.scannedAt)}</Text>
      </View>
      <View style={[styles.pill, pillTone[item.syncStatus]]}>
        <Text style={[styles.pillText, pillTextTone[item.syncStatus]]}>
          {STATUS_LABEL[item.syncStatus]}
        </Text>
      </View>
    </View>
  );
}

const pillTone = StyleSheet.create({
  pending: { backgroundColor: '#fef3c7' },
  synced: { backgroundColor: '#dcfce7' },
  failed: { backgroundColor: '#fee2e2' },
});

const pillTextTone = StyleSheet.create({
  pending: { color: '#92400e' },
  synced: { color: '#166534' },
  failed: { color: '#991b1b' },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  highlight: {
    backgroundColor: '#f8fafc',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  code: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  time: {
    fontSize: 12,
    color: '#64748b',
    fontVariant: ['tabular-nums'],
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
