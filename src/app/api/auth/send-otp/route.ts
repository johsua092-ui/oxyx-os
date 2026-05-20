// ─────────────────────────────────────────────────────────────
// Oxyx OS / API / Auth / Send OTP
// Generates a 6-digit OTP, stores it in Firestore with a
// 5-minute expiry, and sends it to the user's email via Resend.
// Called after successful password verification.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a cryptographically random 6-digit OTP
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, uid } = body;

    if (!email || !uid) {
      return NextResponse.json(
        { error: 'Missing email or uid' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP in Firestore via Admin SDK
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const { getAdminAuth } = await import('@/lib/firebase-admin');
    getAdminAuth(); // ensure admin app is initialized
    const db = getFirestore();

    await db.collection('otp_codes').doc(uid).set({
      code: otp,
      email,
      expiresAt,
      attempts: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Send OTP via Resend
    const { error: sendError } = await resend.emails.send({
      from: 'Oxyx OS <onboarding@resend.dev>',
      to: email,
      subject: `🔐 Oxyx OS — Verification Code: ${otp}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0a0b0e; color: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 20px; font-weight: 300; letter-spacing: 0.4em; color: rgba(255,255,255,0.7); margin: 0;">OXYX</h1>
            <p style="font-size: 10px; letter-spacing: 0.2em; color: rgba(255,255,255,0.15); text-transform: uppercase; margin-top: 4px;">System Authentication</p>
          </div>
          
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 32px; text-align: center;">
            <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 0 0 16px 0; letter-spacing: 0.1em;">YOUR VERIFICATION CODE</p>
            <div style="font-size: 36px; font-weight: 600; letter-spacing: 0.3em; color: rgba(255,255,255,0.9); padding: 16px 0; font-family: 'Courier New', monospace;">${otp}</div>
            <p style="font-size: 11px; color: rgba(255,255,255,0.2); margin: 16px 0 0 0;">Expires in 5 minutes</p>
          </div>

          <p style="font-size: 11px; color: rgba(255,255,255,0.15); text-align: center; margin-top: 24px;">
            If you did not request this code, someone may be attempting to access your account.
          </p>
          
          <div style="text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.04);">
            <p style="font-size: 8px; color: rgba(255,255,255,0.08); letter-spacing: 0.15em; text-transform: uppercase;">RESTRICTED ACCESS · AUTHORIZED PERSONNEL ONLY</p>
          </div>
        </div>
      `,
    });

    if (sendError) {
      console.error('[OTP] Failed to send email:', sendError);
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    // Log the OTP send event (don't log the actual code!)
    await db.collection('system_logs').add({
      event: 'otp_sent',
      details: { email, uid },
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('[OTP] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
