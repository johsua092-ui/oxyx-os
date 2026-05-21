// ─────────────────────────────────────────────────────────────
// Oxyx OS / Security Middleware
// Injects security headers on EVERY response.
// This is the most reliable method on Vercel deployments.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins for CORS (add your domain here)
const ALLOWED_ORIGINS = [
  'https://oxyx-os.vercel.app',
  'https://www.oxyx-os.vercel.app',
  // Add custom domain here when ready, e.g.:
  // 'https://oxyx.yourdomain.com',
];

// CSP directives (hardened — matches next.config.ts)
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' https://firebasestorage.googleapis.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://api.spotify.com https://accounts.spotify.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

export default function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get('origin') || '';

  // ─── Security Headers ──────────────────────────────────
  response.headers.set('Content-Security-Policy', CSP_DIRECTIVES);
  response.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), interest-cohort=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // ─── Remove server identification ──────────────────────
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  // ─── CORS — restrict to allowed origins ────────────────
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    // No wildcard '*' — block unknown origins
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  return response;
}

// Run on all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
