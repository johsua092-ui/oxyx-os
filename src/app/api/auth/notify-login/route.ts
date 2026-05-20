// ─────────────────────────────────────────────────────────────
// Oxyx OS / API / Auth / Login Notification
// Sends an email notification to the owner every time a
// successful login occurs. Includes IP, time, and user agent.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, uid } = body;

    if (!email || !uid) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Extract client info from headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'Unknown';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const now = new Date();
    const timeStr = now.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Parse browser info from user agent
    let browser = 'Unknown Browser';
    if (userAgent.includes('Edg/')) browser = 'Microsoft Edge';
    else if (userAgent.includes('Chrome/')) browser = 'Google Chrome';
    else if (userAgent.includes('Firefox/')) browser = 'Mozilla Firefox';
    else if (userAgent.includes('Safari/')) browser = 'Safari';

    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // Send notification email
    const { error: sendError } = await resend.emails.send({
      from: 'Oxyx OS <onboarding@resend.dev>',
      to: email,
      subject: `⚡ Oxyx OS — Login Detected`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0a0b0e; color: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 20px; font-weight: 300; letter-spacing: 0.4em; color: rgba(255,255,255,0.7); margin: 0;">OXYX</h1>
            <p style="font-size: 10px; letter-spacing: 0.2em; color: rgba(255,255,255,0.15); text-transform: uppercase; margin-top: 4px;">Login Alert</p>
          </div>
          
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 24px;">
            <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 20px 0;">
              A successful login was detected on your Oxyx OS account.
            </p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.1em; width: 100px;">TIME</td>
                <td style="padding: 8px 0; font-size: 12px; color: rgba(255,255,255,0.6);">${timeStr} WIB</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.1em;">IP ADDRESS</td>
                <td style="padding: 8px 0; font-size: 12px; color: rgba(255,255,255,0.6); font-family: 'Courier New', monospace;">${ip}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.1em;">BROWSER</td>
                <td style="padding: 8px 0; font-size: 12px; color: rgba(255,255,255,0.6);">${browser}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.1em;">OS</td>
                <td style="padding: 8px 0; font-size: 12px; color: rgba(255,255,255,0.6);">${os}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.1em;">ACCOUNT</td>
                <td style="padding: 8px 0; font-size: 12px; color: rgba(255,255,255,0.6);">${email}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 11px; color: rgba(255,255,255,0.15); text-align: center; margin-top: 24px;">
            If this wasn't you, change your password immediately and review your account security.
          </p>
          
          <div style="text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.04);">
            <p style="font-size: 8px; color: rgba(255,255,255,0.08); letter-spacing: 0.15em; text-transform: uppercase;">OXYX OS · SECURITY MONITORING</p>
          </div>
        </div>
      `,
    });

    if (sendError) {
      console.error('[Login Notify] Email send failed:', sendError);
      // Don't block login — notification is non-critical
      return NextResponse.json({ success: false, error: 'Email failed' });
    }

    // Log notification event
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const { getAdminAuth } = await import('@/lib/firebase-admin');
    getAdminAuth();
    const db = getFirestore();

    await db.collection('system_logs').add({
      event: 'login_notification_sent',
      details: { email, uid, ip, browser, os },
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Login Notify] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
