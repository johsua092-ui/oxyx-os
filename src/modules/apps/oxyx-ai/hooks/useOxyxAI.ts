// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Oxyx AI / Hook
// Custom hook for sending messages, handling AI responses,
// and persisting chat history to Firestore.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef } from 'react';
import { useOxyxAIStore } from '../store/oxyxAIStore';
import { auth } from '@/lib/firebase';
import { saveConversation, getConversationMessages, StoredMessage } from '@/lib/firestore';

export function useOxyxAI() {
  const {
    messages,
    mode,
    isProcessing,
    pendingImage,
    error,
    addUserMessage,
    addAssistantMessage,
    setProcessing,
    setError,
  } = useOxyxAIStore();

  // Conversation ID — persists across messages in one session
  const conversationId = useRef<string>(`conv-${Date.now()}`);

  // Auto-save to Firestore after each assistant response
  const saveToFirestore = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || messages.length < 2) return;

    const storedMessages: StoredMessage[] = messages
      .filter(m => !m.isLoading)
      .map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        hasImage: !!m.imagePreview,
      }));

    // Title = first user message (truncated)
    const firstUserMsg = messages.find(m => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.substring(0, 80) || 'Image Analysis'
      : 'Untitled';

    try {
      await saveConversation(user.uid, conversationId.current, storedMessages, title);
    } catch {
      // Silent fail — don't break chat if Firestore save fails
    }
  }, [messages]);

  // Save after assistant responds (messages updated)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && !lastMsg.isLoading) {
      saveToFirestore();
    }
  }, [messages, saveToFirestore]);

  // Load conversation from Firestore
  const loadConversation = useCallback(async (convId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const storedMessages = await getConversationMessages(user.uid, convId);
      if (storedMessages.length > 0) {
        // Clear current chat and load stored messages
        const store = useOxyxAIStore.getState();
        store.clearChat();
        conversationId.current = convId;

        storedMessages.forEach(m => {
          if (m.role === 'user') {
            store.addUserMessage(m.content);
          } else {
            store.addAssistantMessage(`loaded-${m.timestamp}`, m.content);
          }
        });
      }
    } catch {
      // Silent fail
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() && !pendingImage) return;
    setError(null);
    setProcessing(true);

    // Add user message to store
    const image = pendingImage
      ? { base64: pendingImage.base64, mimeType: pendingImage.mimeType, preview: pendingImage.preview }
      : undefined;

    addUserMessage(content, image);

    // Prepare placeholder for assistant response
    const assistantId = `resp-${Date.now()}`;

    try {
      const hasImage = !!image;
      const endpoint = hasImage ? '/api/ai/analyze' : '/api/ai/chat';

      // Build the messages payload for the API
      const apiMessages = [
        ...messages
          .filter(m => !m.isLoading)
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp,
          })),
        {
          role: 'user' as const,
          content,
          timestamp: Date.now(),
          ...(hasImage
            ? { imageBase64: image!.base64, imageMimeType: image!.mimeType }
            : {}),
        },
      ];

      // Get Firebase auth token
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await response.json() as {
        success: boolean;
        data?: { content: string; providerId: string; model: string; latencyMs: number };
        error?: string;
      };

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to get response from Oxyx AI.');
      }

      addAssistantMessage(assistantId, data.data.content, {
        provider: data.data.providerId,
        model: data.data.model,
        latencyMs: data.data.latencyMs,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      addAssistantMessage(assistantId, `System error: ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  }, [messages, pendingImage, addUserMessage, addAssistantMessage, setProcessing, setError]);

  return {
    messages,
    mode,
    isProcessing,
    error,
    sendMessage,
    loadConversation,
    conversationId: conversationId.current,
  };
}
