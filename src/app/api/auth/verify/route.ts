// ─────────────────────────────────────────────────────────────
// Oxyx OS / API / Auth Guard
// Server-side endpoint that runs after every login to verify
// the user is whitelisted. If not, the account is immediately
// deleted via Firebase Admin SDK and the session is rejected.
//
// This is the definitive fix for the signup-via-API exploit:
// even if someone creates an account by directly hitting the
// Firebase Identity Toolkit endpoint, they will be purged the
// moment they try to use Oxyx OS.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

// ─── Whitelist: Only these emails can access Oxyx OS ────────
// Add any trusted emails here. Everyone else gets purged.
const WHITELISTED_EMAILS: string[] = [
  'johsua092@gmail.com',
  // Add more trusted users below:
  // 'friend@example.com',
];

export async function POST(request: NextRequest) {
  try {
    // Extract the Firebase ID token from the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization token' },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7);
    const adminAuth = getAdminAuth();

    // ─── Verify the token with full cryptographic validation ──
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true);
    } catch (err) {
      console.error('[Auth Guard] Token verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const email = decodedToken.email || '';
    const uid = decodedToken.uid;

    // ─── Check whitelist ─────────────────────────────────────
    if (!WHITELISTED_EMAILS.includes(email.toLowerCase())) {
      // UNAUTHORIZED USER — delete their account immediately
      console.warn(
        `[Auth Guard] UNAUTHORIZED SIGNUP DETECTED — deleting account: ${email} (${uid})`
      );

      try {
        await adminAuth.deleteUser(uid);
        console.warn(`[Auth Guard] Account ${email} (${uid}) PURGED successfully.`);
      } catch (deleteErr) {
        console.error(`[Auth Guard] Failed to delete unauthorized account ${uid}:`, deleteErr);
      }

      return NextResponse.json(
        {
          error: 'ACCESS_DENIED',
          message: 'This system is restricted. Your account has been terminated.',
        },
        { status: 403 }
      );
    }

    // ─── Authorized user — grant access ──────────────────────
    const isOwner = email.toLowerCase() === 'johsua092@gmail.com';

    return NextResponse.json({
      success: true,
      data: {
        uid,
        email,
        isOwner,
        whitelisted: true,
      },
    });
  } catch (error) {
    console.error('[Auth Guard] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
