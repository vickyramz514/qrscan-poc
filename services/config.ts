/**
 * Base URL for POST /api/qr-items, without a trailing slash.
 * Leave empty to use the built-in mock API (no server required).
 * Override at build time with EXPO_PUBLIC_API_BASE_URL.
 */
const DEFAULT_API_BASE_URL = '';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
).replace(/\/$/, '');
