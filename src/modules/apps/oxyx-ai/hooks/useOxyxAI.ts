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
    selectedProvider,
    conversationMemory,
    isSpeaking,
    setSpeaking,
    ttsEnabled,
    setTtsEnabled,
  } = useOxyxAIStore();

  // Conversation ID — persists across messages in one session
  const conversationId = useRef<string>(`conv-${Date.now()}`);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Text-To-Speech function
  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    // Clean markdown characters for cleaner TTS output
    const cleanText = text
      .replace(/[*#`_\-]/g, '') // remove markdown characters
      .replace(/\[.*?\]\(.*?\)/g, '') // remove links
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a good English or Indonesian voice
    const voices = window.speechSynthesis.getVoices();
    const isIndo = cleanText.match(/[a-zA-Z]/g) && (cleanText.includes('dan') || cleanText.includes('yang') || cleanText.includes('saya') || cleanText.includes('adalah'));
    
    let voice = voices.find(v => v.lang.startsWith(isIndo ? 'id' : 'en'));
    if (!voice) voice = voices[0];
    if (voice) utterance.voice = voice;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [setSpeaking]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() && !pendingImage) return;
    setError(null);
    setProcessing(true);

    // Stop speaking if new message is sent
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }

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

      // Trim history based on memory toggle
      let trimmedHistory: typeof messages = [];
      if (conversationMemory) {
        const conversationHistory = messages.filter(m => !m.isLoading);
        trimmedHistory = conversationHistory.slice(-8);
      }

      // Build the messages payload for the API
      const apiMessages = [
        ...trimmedHistory.map(m => ({
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

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          preferredProvider: selectedProvider !== 'auto' ? selectedProvider : undefined
        }),
        signal: controller.signal,
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

      // If user has speaking/listening enabled, read assistant reply
      const storeState = useOxyxAIStore.getState();
      if (storeState.isListening || storeState.ttsEnabled) {
        speakText(data.data.content);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        addAssistantMessage(assistantId, 'Request cancelled.');
        return;
      }
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      addAssistantMessage(assistantId, `System error: ${errorMsg}`);
    } finally {
      abortControllerRef.current = null;
      setProcessing(false);
    }
  }, [messages, pendingImage, addUserMessage, addAssistantMessage, setProcessing, setError, conversationMemory, selectedProvider, setSpeaking, speakText]);

  const startNewChat = useCallback(() => {
    const store = useOxyxAIStore.getState();
    store.clearChat();
    conversationId.current = `conv-${Date.now()}`;
  }, []);

  const cancelMessage = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    mode,
    isProcessing,
    error,
    sendMessage,
    cancelMessage,
    loadConversation,
    startNewChat,
    conversationId: conversationId.current,
  };
}
