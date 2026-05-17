// ─────────────────────────────────────────────────────────────
// Oxyx OS / Lib / API Security
// Auth verification, rate limiting, owner bypass.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

// Owner email - unrestricted access
const OWNER_EMAIL = 'johusa098@gmail.com';

// ─── JWT Decoder (Firebase ID Token) ────────────────────────
interface TokenPayload {
  email?: string;
  user_id?: string;
  exp?: number;
  iss?: string;
  aud?: string;
}

function decodeFirebaseToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    // Check issuer (must be Firebase)
    if (payload.iss && !payload.iss.includes('securetoken.google.com')) return null;

    return payload;
  } catch {
    return null;
  }
}

// ─── Auth Verification ──────────────────────────────────────
export interface AuthResult {
  authenticated: boolean;
  isOwner: boolean;
  email: string | null;
  userId: string | null;
}

export function verifyAuth(request: NextRequest): AuthResult {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, isOwner: false, email: null, userId: null };
  }

  const token = authHeader.substring(7);
  const payload = decodeFirebaseToken(token);

  if (!payload) {
    return { authenticated: false, isOwner: false, email: null, userId: null };
  }

  const email = payload.email || null;
  const isOwner = email === OWNER_EMAIL;

  return {
    authenticated: true,
    isOwner,
    email,
    userId: payload.user_id || null,
  };
}

// ─── Auth Guard (returns error response if not authenticated) ──
export function requireAuth(request: NextRequest): { auth: AuthResult; error?: NextResponse } {
  const auth = verifyAuth(request);

  if (!auth.authenticated) {
    return {
      auth,
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  return { auth };
}

// ─── Rate Limiter ───────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  ip: string,
  limit: number = 30,
  windowMs: number = 60000
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

// Clean up stale entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }, 60000);
}

// ─── Safe Error Messages ────────────────────────────────────
export function safeError(error: unknown): string {
  // Never expose internal details in production
  if (process.env.NODE_ENV === 'production') {
    return 'An internal error occurred. Please try again.';
  }
  return error instanceof Error ? error.message : 'Unknown error';
}
