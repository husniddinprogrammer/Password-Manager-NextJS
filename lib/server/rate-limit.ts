/**
 * Simple in-memory rate limiter.
 * Uses a sliding-window counter keyed on an arbitrary string (typically IP + route).
 * For multi-instance deployments, replace the Map with a Redis-backed store.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Prune expired buckets every 10 minutes to prevent unbounded growth.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      if (now > bucket.resetAt) store.delete(key);
    }
  },
  10 * 60 * 1000
);

/**
 * Check whether a request is within the allowed rate.
 * Returns `true` if the request is allowed, `false` if it should be blocked.
 *
 * @param key        Unique identifier, e.g. `login:127.0.0.1`
 * @param max        Maximum requests allowed in the window
 * @param windowMs   Window length in milliseconds
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) return false;

  bucket.count++;
  return true;
}

/**
 * Reset the counter for a key (e.g. after a successful login).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
