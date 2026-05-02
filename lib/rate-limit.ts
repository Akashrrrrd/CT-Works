/**
 * Simple in-memory rate limiter — Edge & Node compatible.
 * Limits login attempts per IP to prevent brute-force.
 */

interface Bucket {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, Bucket>();

const WINDOW_MS  = 15 * 60 * 1000;  // 15-minute window
const MAX_HITS   = 10;               // max attempts per window

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now    = Date.now();
  let   bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, bucket);
  }

  bucket.count++;

  // Prune old keys every ~500 calls to avoid memory leak
  if (store.size > 500) {
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k);
    }
  }

  return {
    allowed:   bucket.count <= MAX_HITS,
    remaining: Math.max(0, MAX_HITS - bucket.count),
    resetAt:   bucket.resetAt,
  };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}
