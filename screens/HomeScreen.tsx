import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScannedItemRow } from '../components/ScannedItemRow';
import { Screen } from '../components/Screen';
import { useQrItems } from '../hooks/useQrItems';

type HomeScreenProps = {
  onStartScanning: () => void;
};

export function HomeScreen({ onStartScanning }: HomeScreenProps) {
  const { ready, items, localCount, syncingCount, syncedCount, failedCount, isOnline, syncing } =
    useQrItems();
  const scans = [...items].reverse();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>QR Scanner</Text>
          <View style={[styles.network, isOnline ? styles.networkOnline : styles.networkOffline]}>
            {syncing ? (
              <ActivityIndicator size="small" color="#166534" />
            ) : (
              <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
            )}
            <Text style={[styles.networkText, isOnline ? styles.online : styles.offline]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Each scan shows whether it reached the server, is uploading, or is waiting on this phone.
        </Text>

        <View style={styles.stats}>
          <Stat label="Synced" value={ready ? String(syncedCount) : '–'} />
          <Stat label="Local" value={ready ? String(localCount) : '–'} />
          <Stat label="Syncing" value={ready ? String(syncingCount) : '–'} />
        </View>
        {failedCount > 0 ? (
          <Text style={styles.failed}>
            {failedCount} couldn’t upload. They’ll retry when you’re back online.
          </Text>
        ) : null}

        <Text style={styles.section}>{scans.length > 0 ? 'Scans' : 'Saved scans'}</Text>
        {scans.length > 0 ? (
          <View style={styles.recent}>
            {scans.map((item, index) => (
              <ScannedItemRow key={item.listKey} item={item} highlight={index === 0} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{ready ? 'No scans yet' : 'Loading scans…'}</Text>
            <Text style={styles.emptyBody}>
              Start the camera and scan a code. It is sent to the server without waiting on the result.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={onStartScanning}
        >
          <Text style={styles.buttonText}>Start Scanning</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 23,
    color: '#475569',
  },
  network: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  networkOnline: {
    backgroundColor: '#dcfce7',
  },
  networkOffline: {
    backgroundColor: '#fee2e2',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#16a34a',
  },
  dotOffline: {
    backgroundColor: '#dc2626',
  },
  networkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  online: {
    color: '#166534',
  },
  offline: {
    color: '#991b1b',
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  stat: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  failed: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
  },
  section: {
    marginTop: 28,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  recent: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  emptyCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#64748b',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  button: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.86,
  },
});
