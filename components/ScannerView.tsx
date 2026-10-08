import { CameraView, type BarcodeScanningResult, type BarcodeType } from 'expo-camera';
import { memo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

const QR_TYPES: BarcodeType[] = ['qr'];

const barcodeScannerSettings = {
  barcodeTypes: QR_TYPES,
};

type ScannerViewProps = {
  onCode: (value: string) => void;
};

function Corner({ style }: { style: ViewStyle }) {
  return <View pointerEvents="none" style={[styles.corner, style]} />;
}

function ScannerViewComponent({ onCode }: ScannerViewProps) {
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  // Stable callback so the camera preview is not restarted when the list updates.
  const onBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    const value = result.data.trim();
    if (!value) return;
    onCodeRef.current(value);
  }, []);

  return (
    <View style={styles.wrap}>
      <CameraView
        style={styles.camera}
        facing="back"
        mode="picture"
        barcodeScannerSettings={barcodeScannerSettings}
        onBarcodeScanned={onBarcodeScanned}
      />
      <Corner style={styles.topLeft} />
      <Corner style={styles.topRight} />
      <Corner style={styles.bottomLeft} />
      <Corner style={styles.bottomRight} />
      <View pointerEvents="none" style={styles.liveWrap}>
        <View style={styles.live}>
          <View style={styles.dot} />
          <Text style={styles.liveText}>Scanning</Text>
        </View>
      </View>
    </View>
  );
}

export const ScannerView = memo(ScannerViewComponent);

const styles = StyleSheet.create({
  wrap: {
    height: 260,
    backgroundColor: '#0f172a',
  },
  camera: {
    flex: 1,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
  },
  topLeft: {
    top: 36,
    left: 56,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 36,
    right: 56,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 36,
    left: 56,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 36,
    right: 56,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  liveWrap: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.72)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
