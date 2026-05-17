// ─────────────────────────────────────────────────────────────
// Oxyx OS / Lib / Firestore Service
// User profiles and chat history persistence.
// ─────────────────────────────────────────────────────────────

import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── User Profile ────────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'user';
  bypassRateLimit: boolean;
  aiCreditsUsed: number;
  loginCount: number;
  lastLoginAt: Timestamp | null;
  createdAt: Timestamp | null;
  lastLoginIP?: string;
}

/**
 * Creates or updates user profile on login.
 * Increments login count and updates last login timestamp.
 */
export async function syncUserProfile(uid: string, email: string, displayName: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    // Existing user — update login stats
    const existing = snapshot.data() as UserProfile;
    const updated: Partial<UserProfile> = {
      lastLoginAt: serverTimestamp() as unknown as Timestamp,
      loginCount: (existing.loginCount || 0) + 1,
      displayName: displayName || existing.displayName,
    };
    await setDoc(userRef, updated, { merge: true });
    return { ...existing, ...updated };
  } else {
    // New user — create profile
    const isOwner = email === 'johusa098@gmail.com';
    const profile: UserProfile = {
      uid,
      email,
      displayName: displayName || email.split('@')[0],
      role: isOwner ? 'owner' : 'user',
      bypassRateLimit: isOwner,
      aiCreditsUsed: 0,
      loginCount: 1,
      lastLoginAt: serverTimestamp() as unknown as Timestamp,
      createdAt: serverTimestamp() as unknown as Timestamp,
    };
    await setDoc(userRef, profile);
    return profile;
  }
}

/**
 * Get user profile by UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

// ─── Chat History ────────────────────────────────────────────
export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  hasImage?: boolean;
}

/**
 * Save a conversation to Firestore.
 * Each conversation is a document with an array of messages.
 */
export async function saveConversation(
  uid: string,
  conversationId: string,
  messages: StoredMessage[],
  title: string
): Promise<void> {
  const convRef = doc(db, 'users', uid, 'conversations', conversationId);
  await setDoc(convRef, {
    title,
    messages,
    messageCount: messages.length,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Load recent conversations for a user.
 */
export async function getConversations(
  uid: string,
  maxResults: number = 20
): Promise<Array<{ id: string; title: string; messageCount: number; updatedAt: Timestamp }>> {
  const convsRef = collection(db, 'users', uid, 'conversations');
  const q = query(convsRef, orderBy('updatedAt', 'desc'), limit(maxResults));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(d => ({
    id: d.id,
    title: d.data().title,
    messageCount: d.data().messageCount,
    updatedAt: d.data().updatedAt,
  }));
}

/**
 * Load a specific conversation's messages.
 */
export async function getConversationMessages(
  uid: string,
  conversationId: string
): Promise<StoredMessage[]> {
  const convRef = doc(db, 'users', uid, 'conversations', conversationId);
  const snapshot = await getDoc(convRef);

  if (!snapshot.exists()) return [];
  return snapshot.data().messages || [];
}

/**
 * Delete a conversation.
 */
export async function deleteConversation(uid: string, conversationId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'conversations', conversationId));
}

// ─── System Logs (Audit Trail) ──────────────────────────────
export async function logSystemEvent(
  event: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await addDoc(collection(db, 'system_logs'), {
      event,
      details,
      timestamp: serverTimestamp(),
    });
  } catch {
    // Silent fail — logging should never break the app
  }
}
