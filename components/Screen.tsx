import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  Platform,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  View,
} from 'react-native';

type ScreenProps = {
  children: ReactNode;
};

export function Screen({ children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View
        style={[
          styles.body,
          Platform.OS === 'android' ? { paddingTop: NativeStatusBar.currentHeight ?? 0 } : null,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  body: {
    flex: 1,
  },
});
