import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-security';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authentication & Ownership
    const { auth, error } = requireAuth(req);
    if (error) return error;

    if (!auth.isOwner) {
      return NextResponse.json({ error: 'Forbidden: Owner access required' }, { status: 403 });
    }

    // 2. Initialize Firestore Admin SDK dynamically
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getAdminAuth } = await import('@/lib/firebase-admin');
    getAdminAuth();
    const db = getFirestore();

    // 3. Get all user profiles to map userId -> email
    const usersSnapshot = await db.collection('users').get();
    const userEmailMap = new Map<string, string>();
    usersSnapshot.forEach(doc => {
      userEmailMap.set(doc.id, doc.data().email || 'Unknown User');
    });

    // 4. Fetch all user conversations using Collection Group query
    // We avoid ordering inside query to bypass Firestore Collection Group Index requirement
    const convsSnapshot = await db.collectionGroup('conversations')
      .limit(100)
      .get();

    const conversations = convsSnapshot.docs.map(doc => {
      const data = doc.data();
      const pathParts = doc.ref.path.split('/');
      const userId = pathParts[1]; // path is: users/{userId}/conversations/{convId}
      
      let updatedAtDate = new Date();
      if (data.updatedAt) {
        if (typeof data.updatedAt.toDate === 'function') {
          updatedAtDate = data.updatedAt.toDate();
        } else if (data.updatedAt._seconds !== undefined) {
          updatedAtDate = new Date(data.updatedAt._seconds * 1000);
        } else {
          updatedAtDate = new Date(data.updatedAt);
        }
      }

      return {
        id: doc.id,
        userId,
        email: userEmailMap.get(userId) || 'Unknown User',
        title: data.title || 'Untitled Conversation',
        messageCount: data.messageCount || 0,
        updatedAt: updatedAtDate,
        messages: data.messages || [],
      };
    });

    // 5. Sort in-memory and limit to 50
    conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const limitedConversations = conversations.slice(0, 50);

    return NextResponse.json({ success: true, data: limitedConversations });
  } catch (error: any) {
    console.error('System Conversations API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
