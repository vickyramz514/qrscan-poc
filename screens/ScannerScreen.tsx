import { useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionBar } from '../components/ActionBar';
import { ScanStats } from '../components/ScanStats';
import { ScannedList } from '../components/ScannedList';
import { ScannerView } from '../components/ScannerView';
import { Screen } from '../components/Screen';
import { useQrItems } from '../hooks/useQrItems';

type ScannerScreenProps = {
  onClose: () => void;
};

export function ScannerScreen({ onClose }: ScannerScreenProps) {
  const {
    items,
    isOnline,
    notice,
    localCount,
    syncingCount,
    syncedCount,
    failedCount,
    saving,
    refreshing,
    addScan,
    save,
    refresh,
    clearAll,
  } = useQrItems();

  const [permission, requestPermission] = useCameraPermissions();
  const [snackbar, setSnackbar] = useState<{ message: string; tone: 'success' | 'error' } | null>(
    null,
  );
  const [snackbarId, setSnackbarId] = useState(0);
  const askedRef = useRef(false);

  useEffect(() => {
    if (!snackbar) return;
    const timeout = setTimeout(() => setSnackbar(null), 2000);
    return () => clearTimeout(timeout);
  }, [snackbar, snackbarId]);

  useEffect(() => {
    if (!permission || permission.granted || askedRef.current) return;
    askedRef.current = true;
    void requestPermission();
  }, [permission, requestPermission]);

  const showSnackbar = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setSnackbar({ message, tone });
    setSnackbarId((id) => id + 1);
  }, []);

  const onCode = useCallback(
    (detection: { code: string; scannerType: string }) => {
      const result = addScan(detection);
      if (result === 'duplicate') {
        showSnackbar('This code already exists', 'error');
        return;
      }
      if (result !== 'added') return;
      showSnackbar(`Added ${truncate(detection.code)}`);
    },
    [addScan, showSnackbar],
  );

  const onClear = useCallback(() => {
    Alert.alert(
      'Clear all scans?',
      'This deletes every scan stored on the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearAll() },
      ],
    );
  }, [clearAll]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>QR Scanner</Text>
        <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      {permission?.granted ? (
        <ScannerView onCode={onCode} />
      ) : (
        <View style={styles.permission}>
          <Text style={styles.permissionText}>
            {permission
              ? 'Camera access is needed to scan QR codes.'
              : 'Checking camera permission…'}
          </Text>
          {permission && !permission.granted ? (
            <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
              <Text style={styles.permissionButtonText}>Allow Camera</Text>
            </Pressable>
          ) : null}
          {permission && !permission.granted && permission.canAskAgain === false ? (
            <Pressable style={styles.permissionButton} onPress={() => void Linking.openSettings()}>
              <Text style={styles.permissionButtonText}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <ScanStats
        total={items.length}
        localCount={localCount}
        syncingCount={syncingCount}
        syncedCount={syncedCount}
        failedCount={failedCount}
        isOnline={isOnline}
      />

      {notice ? (
        <Text style={[styles.notice, notice.tone === 'error' && styles.noticeError]}>
          {notice.message}
        </Text>
      ) : null}

      <ScannedList items={items} refreshing={refreshing} onRefresh={() => void refresh()} />
      <ActionBar
        onSave={() => void save()}
        onClear={onClear}
        saving={saving}
        canClear={items.length > 0}
      />

      {snackbar ? (
        <View pointerEvents="none" style={styles.snackbarAnchor}>
          <View style={[styles.snackbar, snackbar.tone === 'error' && styles.snackbarError]}>
            <Text style={styles.snackbarText}>{snackbar.message}</Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  close: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  permission: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0f172a',
    gap: 12,
  },
  permissionText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
  },
  permissionButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#111',
    fontWeight: '700',
  },
  notice: {
    paddingVertical: 8,
    textAlign: 'center',
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontWeight: '700',
  },
  noticeError: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  snackbarAnchor: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 92,
    alignItems: 'center',
  },
  snackbar: {
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  snackbarError: {
    backgroundColor: '#991b1b',
  },
  snackbarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

function truncate(value: string): string {
  return value.length > 28 ? `${value.slice(0, 25)}…` : value;
}
