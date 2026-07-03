/**
 * Lightweight in-memory rate limiter (per-process). Suitable for a single-instance
 * deployment behind Nginx. For multi-instance deployments, back this with Redis.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}
