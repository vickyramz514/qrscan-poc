export type SyncStatus = 'pending' | 'synced' | 'failed';

export type QrItem = {
  id: string;
  qrCode: string;
  scannedAt: string;
  syncStatus: SyncStatus;
};

export type QrSyncPayload = {
  id: string;
  qrCode: string;
  scannedAt: string;
};
