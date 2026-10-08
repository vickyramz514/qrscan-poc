import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { DevicePlatform } from '../types/api';

export function currentPlatform(): DevicePlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}
