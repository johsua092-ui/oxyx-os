import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable X-Powered-By header
  poweredByHeader: false,

  // Security Headers (backup — middleware.ts is the primary enforcer)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' https://firebasestorage.googleapis.com",
              "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://api.spotify.com https://accounts.spotify.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join('; ')
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=15552000; includeSubDomains'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
