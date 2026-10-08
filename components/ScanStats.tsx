import { StyleSheet, Text, View } from 'react-native';

type ScanStatsProps = {
  total: number;
  localCount: number;
  syncingCount: number;
  syncedCount: number;
  failedCount: number;
  isOnline: boolean;
};

export function ScanStats({
  total,
  localCount,
  syncingCount,
  syncedCount,
  failedCount,
  isOnline,
}: ScanStatsProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Scanned items ({total})</Text>
      <View style={styles.chips}>
        <Chip label={`${syncedCount} synced`} tone="synced" />
        {localCount > 0 ? <Chip label={`${localCount} saved locally`} tone="local" /> : null}
        {syncingCount > 0 ? <Chip label={`${syncingCount} syncing`} tone="syncing" /> : null}
        {failedCount > 0 ? <Chip label={`${failedCount} sync failed`} tone="failed" /> : null}
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
  tone?: 'neutral' | 'local' | 'syncing' | 'synced' | 'failed';
}) {
  return (
    <View style={[styles.chip, chipTone[tone]]}>
      <Text style={[styles.chipText, chipTextTone[tone]]}>{label}</Text>
    </View>
  );
}

const chipTone = StyleSheet.create({
  neutral: { backgroundColor: '#f1f5f9' },
  local: { backgroundColor: '#ffedd5' },
  syncing: { backgroundColor: '#e0f2fe' },
  synced: { backgroundColor: '#dcfce7' },
  failed: { backgroundColor: '#fee2e2' },
});

const chipTextTone = StyleSheet.create({
  neutral: { color: '#334155' },
  local: { color: '#c2410c' },
  syncing: { color: '#075985' },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
