import { StyleSheet, Text, View } from 'react-native';

type ScanStatsProps = {
  total: number;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  isOnline: boolean;
};

export function ScanStats({
  total,
  pendingCount,
  syncedCount,
  failedCount,
  isOnline,
}: ScanStatsProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Scanned items</Text>
      <View style={styles.chips}>
        <Chip label={`${total} total`} />
        <Chip label={`${pendingCount} pending`} tone="pending" />
        <Chip label={`${syncedCount} synced`} tone="synced" />
        {failedCount > 0 ? <Chip label={`${failedCount} failed`} tone="failed" /> : null}
        <Chip label={isOnline ? 'Online' : 'Offline'} tone={isOnline ? 'synced' : 'failed'} />
      </View>
    </View>
  );
}

function Chip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'pending' | 'synced' | 'failed';
}) {
  return (
    <View style={[styles.chip, chipTone[tone]]}>
      <Text style={[styles.chipText, chipTextTone[tone]]}>{label}</Text>
    </View>
  );
}

const chipTone = StyleSheet.create({
  neutral: { backgroundColor: '#f1f5f9' },
  pending: { backgroundColor: '#fef3c7' },
  synced: { backgroundColor: '#dcfce7' },
  failed: { backgroundColor: '#fee2e2' },
});

const chipTextTone = StyleSheet.create({
  neutral: { color: '#334155' },
  pending: { color: '#92400e' },
  synced: { color: '#166534' },
  failed: { color: '#991b1b' },
});

const styles = StyleSheet.create({
  box: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
