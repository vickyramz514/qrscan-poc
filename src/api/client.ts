import { API_BASE_URL } from '../../services/config';
import type { ApiError as ApiErrorShape } from '../../types/api';

export class ApiError extends Error implements ApiErrorShape {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('Set EXPO_PUBLIC_API_BASE_URL to your API, including /api/v1.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(joinUrl(API_BASE_URL, path), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? parseJson(text) : null;

    if (!response.ok) {
      throw new ApiError(readErrorMessage(payload) ?? `Request failed (${response.status})`, response.status);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The request timed out.');
    }
    throw new ApiError(error instanceof Error ? error.message : 'Network request failed');
  } finally {
    clearTimeout(timeout);
  }
}

function joinUrl(base: string, path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function readErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const body = payload as {
    message?: unknown;
    error?: { message?: unknown };
  };
  const nested = body.error?.message;
  if (typeof nested === 'string' && nested.trim()) return nested;
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  return null;
}
