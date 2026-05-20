// ─────────────────────────────────────────────────────────────
// Oxyx OS / API / System Heartbeat
// Periodic heartbeat endpoint that writes system vitals to
// Firestore, keeping the dashboard activity graph alive and
// providing a real-time health monitoring trail.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

// Use revalidate to make Vercel call this periodically (every 30s)
export const revalidate = 30;

export async function GET() {
  try {
    // Dynamic import to avoid client-side bundling issues
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const { getAdminAuth } = await import('@/lib/firebase-admin');

    // Initialize admin (this also initializes the app)
    getAdminAuth();
    const db = getFirestore();

    const now = new Date();
    const heartbeatId = `hb_${now.toISOString().replace(/[:.]/g, '-')}`;

    // ─── Write system heartbeat ─────────────────────────────
    await db.collection('system_heartbeat').doc(heartbeatId).set({
      timestamp: FieldValue.serverTimestamp(),
      status: 'alive',
      uptime: process.uptime(),
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    });

    // ─── Update system stats counter ────────────────────────
    await db.collection('system_stats').doc('global').set({
      lastHeartbeat: FieldValue.serverTimestamp(),
      totalHeartbeats: FieldValue.increment(1),
      serverMemoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      lastCheckedAt: now.toISOString(),
    }, { merge: true });

    // ─── Cleanup old heartbeats (keep last 100) ─────────────
    const oldHeartbeats = await db.collection('system_heartbeat')
      .orderBy('timestamp', 'desc')
      .offset(100)
      .limit(50)
      .get();

    if (!oldHeartbeats.empty) {
      const batch = db.batch();
      oldHeartbeats.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      heartbeat: heartbeatId,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[Heartbeat] Error:', error);
    return NextResponse.json(
      { error: 'Heartbeat failed' },
      { status: 500 }
    );
  }
}
