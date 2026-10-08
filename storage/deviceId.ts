import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export const DEVICE_ID_STORAGE_KEY = 'scanner_device_id';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let deviceIdPromise: Promise<string> | null = null;

/** Returns the installation id, creating it once and reusing it after that. */
export function loadDeviceId(): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = readOrCreateDeviceId().catch((error: unknown) => {
      deviceIdPromise = null;
      throw error;
    });
  }
  return deviceIdPromise;
}

async function readOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing && UUID_PATTERN.test(existing)) return existing;

  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
  return created;
}
