// ─────────────────────────────────────────────────────────────
// Oxyx OS / Lib / API Security
// Rate limiter + auth token verification for API routes.
// ─────────────────────────────────────────────────────────────

// Simple in-memory rate limiter (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  ip: string,
  limit: number = 30,    // max requests
  windowMs: number = 60000 // per minute
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - entry.count };
}

// Clean up old entries periodically (prevent memory leak)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }, 60000);
}
