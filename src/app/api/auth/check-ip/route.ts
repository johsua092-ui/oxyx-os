// ─────────────────────────────────────────────────────────────
// Oxyx OS / API / Auth / IP Whitelist Check
// Checks if the client's IP is in the allowed whitelist.
// Whitelist is stored in Firestore: ip_whitelist collection.
// If whitelist is empty → allow all (no restriction).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'Unknown';

    // Fetch whitelist from Firestore
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAdminAuth } = await import('@/lib/firebase-admin');
    getAdminAuth();
    const db = getFirestore();

    const whitelistSnap = await db.collection('ip_whitelist').get();

    // If whitelist is empty → allow all (owner hasn't set restrictions yet)
    if (whitelistSnap.empty) {
      return NextResponse.json({
        success: true,
        allowed: true,
        ip,
        reason: 'No whitelist configured — all IPs allowed',
      });
    }

    // Check if IP is in whitelist
    const allowedIPs: string[] = [];
    whitelistSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.ip) allowedIPs.push(data.ip);
    });

    const isAllowed = allowedIPs.includes(ip);

    if (!isAllowed) {
      // Log blocked attempt
      const { FieldValue } = await import('firebase-admin/firestore');
      await db.collection('system_logs').add({
        event: 'ip_blocked',
        details: { ip, allowedIPs },
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      allowed: isAllowed,
      ip,
    });
  } catch (error) {
    console.error('[IP Check] Error:', error);
    // On error, allow login (graceful degradation)
    return NextResponse.json({
      success: true,
      allowed: true,
      ip: 'Unknown',
      reason: 'Check failed — allowing by default',
    });
  }
}

// GET endpoint to manage whitelist (for System Monitor)
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');

    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const { getAdminAuth } = await import('@/lib/firebase-admin');
    getAdminAuth();
    const db = getFirestore();

    if (action === 'list') {
      // List all whitelisted IPs
      const snap = await db.collection('ip_whitelist').get();
      const ips = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      return NextResponse.json({ success: true, ips });
    }

    if (action === 'my-ip') {
      // Return the requester's IP
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'Unknown';
      return NextResponse.json({ success: true, ip });
    }

    if (action === 'add') {
      const ip = request.nextUrl.searchParams.get('ip');
      const label = request.nextUrl.searchParams.get('label') || 'Unlabeled';
      if (!ip) return NextResponse.json({ error: 'Missing IP' }, { status: 400 });

      await db.collection('ip_whitelist').add({
        ip,
        label,
        addedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, message: `${ip} added to whitelist` });
    }

    if (action === 'remove') {
      const id = request.nextUrl.searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

      await db.collection('ip_whitelist').doc(id).delete();
      return NextResponse.json({ success: true, message: 'IP removed from whitelist' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[IP Whitelist] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
