import { StyleSheet, Text, View } from 'react-native';

import type { ClientScanStatus, ScanListItem } from '../types/api';
import { formatScanTime } from '../utils/formatTime';

const STATUS_LABEL: Record<ClientScanStatus, string> = {
  synced: '🟢 Synced',
  local: '🟠 Saved locally',
  syncing: '🔄 Syncing…',
  failed: '🔴 Sync failed',
};

type ScannedItemRowProps = {
  item: ScanListItem;
  highlight?: boolean;
};

export function ScannedItemRow({ item, highlight = false }: ScannedItemRowProps) {
  return (
    <View style={[styles.row, highlight && styles.highlight]}>
      <View style={styles.copy}>
        <Text style={styles.code} numberOfLines={1}>
          {item.code}
        </Text>
        <Text style={styles.time}>{formatScanTime(item.createdAt)}</Text>
      </View>
      <View style={[styles.pill, pillTone[item.clientStatus]]}>
        <Text style={[styles.pillText, pillTextTone[item.clientStatus]]} numberOfLines={1}>
          {STATUS_LABEL[item.clientStatus]}
        </Text>
      </View>
    </View>
  );
}

const pillTone = StyleSheet.create({
  synced: { backgroundColor: '#dcfce7' },
  local: { backgroundColor: '#ffedd5' },
  syncing: { backgroundColor: '#e0f2fe' },
  failed: { backgroundColor: '#fee2e2' },
});

const pillTextTone = StyleSheet.create({
  synced: { color: '#166534' },
  local: { color: '#c2410c' },
  syncing: { color: '#075985' },
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
