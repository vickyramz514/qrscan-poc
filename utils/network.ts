import type { NetInfoState } from '@react-native-community/netinfo';

export function isOnlineState(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}
