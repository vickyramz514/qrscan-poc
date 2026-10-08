import { API_BASE_URL } from './config';
import type { QrSyncPayload } from '../types/qrItem';

export type SyncBatchResult = {
  syncedIds: string[];
  failedIds: string[];
};

type ItemResult = {
  id?: unknown;
  ok?: unknown;
};

/**
 * Posts a batch of QR items.
 * With no API_BASE_URL, a mock response is returned so the POC can run offline-first
 * without a server. A payload whose qrCode starts with "FAIL:" is reported as failed
 * by the mock so partial failure can be demonstrated.
 */
export async function postQrItems(items: QrSyncPayload[]): Promise<SyncBatchResult> {
  if (items.length === 0) {
    return { syncedIds: [], failedIds: [] };
  }

  if (!API_BASE_URL) {
    return mockPostQrItems(items);
  }

  return httpPostQrItems(items);
}

async function mockPostQrItems(items: QrSyncPayload[]): Promise<SyncBatchResult> {
  await delay(600);

  const syncedIds: string[] = [];
  const failedIds: string[] = [];

  for (const item of items) {
    if (item.qrCode.startsWith('FAIL:')) {
      failedIds.push(item.id);
    } else {
      syncedIds.push(item.id);
    }
  }

  return { syncedIds, failedIds };
}

async function httpPostQrItems(items: QrSyncPayload[]): Promise<SyncBatchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/qr-items`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Sync failed (${response.status})`);
    }

    const text = await response.text();
    if (!text) {
      return { syncedIds: items.map((item) => item.id), failedIds: [] };
    }

    return parseSyncResponse(JSON.parse(text) as unknown, items);
  } finally {
    clearTimeout(timeout);
  }
}

function parseSyncResponse(body: unknown, items: QrSyncPayload[]): SyncBatchResult {
  if (!body || typeof body !== 'object' || !('results' in body)) {
    return { syncedIds: items.map((item) => item.id), failedIds: [] };
  }

  const results = (body as { results: unknown }).results;
  if (!Array.isArray(results)) {
    return { syncedIds: items.map((item) => item.id), failedIds: [] };
  }

  const syncedIds: string[] = [];
  const failedIds: string[] = [];

  for (const entry of results) {
    if (!entry || typeof entry !== 'object') continue;
    const result = entry as ItemResult;
    if (typeof result.id !== 'string') continue;
    if (result.ok === true) syncedIds.push(result.id);
    else failedIds.push(result.id);
  }

  return { syncedIds, failedIds };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
