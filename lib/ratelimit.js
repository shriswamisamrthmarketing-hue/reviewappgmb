// Tiny in-memory rate limiter (per server instance). Protects the Gemini key
// from abuse. Good enough for a few QR codes; use Upstash/Redis if you scale out.
const buckets = new Map();

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= limit;
}

// Forget a key (e.g. after a successful login, so only failed attempts count).
export function rateReset(key) {
  buckets.delete(key);
}

export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0] : req.headers.get('x-real-ip')) || 'unknown';
}
