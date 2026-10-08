export type ScanType = 'QR' | 'BARCODE';

export type ClientScanStatus = 'local' | 'syncing' | 'synced' | 'failed';

export type DevicePlatform = 'ios' | 'android';

export interface Device {
  deviceId: string;
  platform: DevicePlatform;
  appVersion: string;
}

export interface InitializeDeviceRequest {
  deviceId: string;
  platform: DevicePlatform;
  appVersion: string;
}

export interface SubmitScanRequest {
  deviceId: string;
  code: string;
  type: ScanType;
}

export interface Scan {
  id: string;
  deviceId: string;
  code: string;
  type: ScanType;
  status: string;
  createdAt: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

/** Row shown in the existing scanner list while a backend request is in flight. */
export interface ScanListItem {
  listKey: string;
  id: string;
  deviceId: string;
  code: string;
  type: ScanType;
  status: string;
  createdAt: string;
  clientStatus: ClientScanStatus;
}
