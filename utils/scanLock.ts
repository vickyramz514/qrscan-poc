/**
 * Drops repeat camera frames for the same code during a short window.
 * A later scan of that code is accepted again after the window expires.
 * The lock is held only while this call runs, not while the API request is in flight.
 */
export function createScanLock(windowMs: number) {
  const acceptedAt = new Map<string, number>();
  let processing = false;

  return {
    tryAccept(code: string, now = Date.now()): boolean {
      if (processing) return false;

      const previous = acceptedAt.get(code);
      if (previous !== undefined && now - previous < windowMs) return false;

      processing = true;
      try {
        acceptedAt.set(code, now);
        return true;
      } finally {
        processing = false;
      }
    },
  };
}
