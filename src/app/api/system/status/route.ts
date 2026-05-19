import { NextRequest, NextResponse } from 'next/server';
import { getAIRouter } from '@/core/engine/ai/ai-router';
import { authAdmin } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authentication
    const sessionCookie = req.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie, true);
    if (!decodedClaims.email || decodedClaims.email !== 'johsua092@gmail.com') {
      return NextResponse.json({ error: 'Forbidden: Owner access required' }, { status: 403 });
    }

    // 2. Fetch AI Router Status
    const aiRouter = getAIRouter();
    const status = aiRouter.getStatus();

    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    console.error('System Monitor API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
