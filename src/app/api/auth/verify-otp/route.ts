// ─────────────────────────────────────────────────────────────
// Oxyx OS / API / Auth / Verify OTP
// Verifies a 6-digit OTP against the code stored in Firestore.
// Enforces max 3 attempts and 5-minute expiry.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const MAX_OTP_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, code } = body;

    if (!uid || !code) {
      return NextResponse.json(
        { error: 'Missing uid or code' },
        { status: 400 }
      );
    }

    // Fetch OTP from Firestore
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const { getAdminAuth } = await import('@/lib/firebase-admin');
    getAdminAuth();
    const db = getFirestore();

    const otpRef = db.collection('otp_codes').doc(uid);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists) {
      return NextResponse.json(
        { error: 'No verification code found. Request a new one.' },
        { status: 404 }
      );
    }

    const otpData = otpDoc.data()!;

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      await otpRef.delete();
      return NextResponse.json(
        { error: 'EXPIRED', message: 'Verification code expired. Request a new one.' },
        { status: 410 }
      );
    }

    // Check max attempts
    if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
      await otpRef.delete();

      // Log brute force attempt
      await db.collection('system_logs').add({
        event: 'otp_brute_force',
        details: { uid, email: otpData.email },
        timestamp: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { error: 'MAX_ATTEMPTS', message: 'Too many incorrect attempts. Request a new code.' },
        { status: 429 }
      );
    }

    // Verify code
    if (code !== otpData.code) {
      // Increment attempt counter
      await otpRef.update({
        attempts: (otpData.attempts || 0) + 1,
      });

      const remaining = MAX_OTP_ATTEMPTS - (otpData.attempts + 1);

      return NextResponse.json(
        { error: 'INVALID_CODE', message: `Incorrect code. ${remaining} attempt(s) remaining.` },
        { status: 401 }
      );
    }

    // ─── OTP Verified Successfully ──────────────────────────
    // Delete the OTP document (one-time use)
    await otpRef.delete();

    // Log successful verification
    await db.collection('system_logs').add({
      event: 'otp_verified',
      details: { uid, email: otpData.email },
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error('[OTP Verify] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
