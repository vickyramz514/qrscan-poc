/**
 * API origin including the /api/v1 prefix.
 * Override with EXPO_PUBLIC_API_BASE_URL.
 */
const DEFAULT_API_BASE_URL = 'https://qrscanapi.datacaptain.in/api/v1';

const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const API_BASE_URL = (configuredUrl || DEFAULT_API_BASE_URL).replace(/\/$/, '');

/** Ignore repeat camera frames of the same code for this long. */
export const SCAN_DEBOUNCE_MS = 2000;
