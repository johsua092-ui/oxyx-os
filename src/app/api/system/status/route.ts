import { NextRequest, NextResponse } from 'next/server';
import { getAIRouter } from '@/core/engine/ai/ai-router';
import { requireAuth } from '@/lib/api-security';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authentication & Ownership
    const { auth, error } = requireAuth(req);
    if (error) return error;

    if (!auth.isOwner) {
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
