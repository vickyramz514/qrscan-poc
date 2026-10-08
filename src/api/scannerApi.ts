import { apiRequest } from './client';
import type {
  InitializeDeviceRequest,
  Scan,
  ScanType,
  SubmitScanRequest,
} from '../../types/api';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function unwrapObject(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.scan)) return value.scan;
  if (isRecord(value.data) && ('code' in value.data || 'id' in value.data)) return value.data;
  return value;
}

function unwrapList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  if (Array.isArray(value.scans)) return value.scans;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  return [];
}

function readTotalPages(value: unknown): number {
  if (!isRecord(value) || !isRecord(value.pagination)) return 1;
  const totalPages = value.pagination.totalPages;
  return typeof totalPages === 'number' && totalPages >= 1 ? Math.floor(totalPages) : 1;
}

export function parseScan(value: unknown): Scan | null {
  const source = unwrapObject(value);
  if (!source) return null;

  const code = readString(source, 'code');
  if (!code) return null;

  const type = readString(source, 'type')?.toUpperCase() === 'BARCODE' ? 'BARCODE' : 'QR';

  return {
    id: readString(source, 'id') ?? '',
    deviceId: readString(source, 'deviceId') ?? '',
    code,
    type,
    status: readString(source, 'status') ?? 'saved',
    createdAt: readString(source, 'createdAt') ?? new Date().toISOString(),
  };
}

export function parseScanList(value: unknown): Scan[] {
  return unwrapList(value).flatMap((entry) => {
    const scan = parseScan(entry);
    return scan ? [scan] : [];
  });
}

async function getDeviceScanPage(
  deviceId: string,
  page: number,
): Promise<{ scans: Scan[]; totalPages: number }> {
  const payload = await apiRequest<unknown>(
    `/devices/${encodeURIComponent(deviceId)}/scans?page=${page}&limit=100`,
  );
  return {
    scans: parseScanList(payload),
    totalPages: readTotalPages(payload),
  };
}

export function initializeDevice(body: InitializeDeviceRequest): Promise<void> {
  return apiRequest<unknown>('/devices', { method: 'POST', body }).then(() => undefined);
}

export async function submitScan(body: SubmitScanRequest): Promise<Scan> {
  const payload = await apiRequest<unknown>('/scans', { method: 'POST', body });
  return (
    parseScan(payload) ?? {
      id: '',
      deviceId: body.deviceId,
      code: body.code,
      type: body.type,
      status: 'saved',
      createdAt: new Date().toISOString(),
    }
  );
}

/** Deletes every scan. The API does not take a scan id or device id. */
export function clearScans(): Promise<unknown> {
  return apiRequest<unknown>('/scans', { method: 'DELETE' });
}

export async function getScans(): Promise<Scan[]> {
  return parseScanList(await apiRequest<unknown>('/scans?page=1&limit=100'));
}

export async function getDeviceScans(deviceId: string): Promise<Scan[]> {
  const page = await getDeviceScanPage(deviceId, 1);
  return page.scans;
}

/** Latest scans for the list, plus every code already stored for this device. */
export async function getDeviceScanHistory(deviceId: string): Promise<{
  scans: Scan[];
  codes: string[];
}> {
  const first = await getDeviceScanPage(deviceId, 1);
  const codes = new Set(first.scans.map((scan) => scan.code));

  for (let page = 2; page <= first.totalPages && page <= 50; page += 1) {
    const next = await getDeviceScanPage(deviceId, page);
    for (const scan of next.scans) codes.add(scan.code);
  }

  return { scans: first.scans, codes: [...codes] };
}

export async function getScan(id: string): Promise<Scan> {
  const payload = await apiRequest<unknown>(`/scans/${encodeURIComponent(id)}`);
  const scan = parseScan(payload);
  if (!scan) {
    throw new Error('Scan response was empty.');
  }
  return scan;
}

export function getHealth(): Promise<unknown> {
  return apiRequest<unknown>('/health');
}

export function toScanType(scannerType: string): ScanType {
  return scannerType.trim().toLowerCase() === 'qr' ? 'QR' : 'BARCODE';
}
