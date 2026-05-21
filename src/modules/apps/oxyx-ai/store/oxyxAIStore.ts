// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Oxyx AI / Store
// State management for the Oxyx AI application.
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imagePreview?: string;     // data URL for preview
  imageBase64?: string;      // raw base64 for API
  imageMimeType?: string;
  timestamp: number;
  provider?: string;
  model?: string;
  latencyMs?: number;
  isLoading?: boolean;
}

export type OxyxMode = 'chat' | 'vision';
export type AIProviderChoice = 'auto' | 'gemini' | 'groq' | 'deepseek';

interface OxyxAIState {
  messages: ChatMessage[];
  mode: OxyxMode;
  isProcessing: boolean;
  currentInput: string;
  pendingImage: { preview: string; base64: string; mimeType: string } | null;
  error: string | null;
  selectedProvider: AIProviderChoice;
  conversationMemory: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  ttsEnabled: boolean;

  // Actions
  setMode: (mode: OxyxMode) => void;
  setInput: (input: string) => void;
  setPendingImage: (img: { preview: string; base64: string; mimeType: string } | null) => void;
  addUserMessage: (content: string, image?: { base64: string; mimeType: string; preview: string }) => string;
  addAssistantMessage: (id: string, content: string, meta?: { provider?: string; model?: string; latencyMs?: number }) => void;
  setMessageLoading: (id: string, loading: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  clearChat: () => void;
  setSelectedProvider: (provider: AIProviderChoice) => void;
  setConversationMemory: (enabled: boolean) => void;
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
}

let messageCounter = 0;
const generateId = () => `msg-${Date.now()}-${++messageCounter}`;

export const useOxyxAIStore = create<OxyxAIState>((set) => ({
  messages: [],
  mode: 'chat',
  isProcessing: false,
  currentInput: '',
  pendingImage: null,
  error: null,
  selectedProvider: 'auto',
  conversationMemory: true,
  isListening: false,
  isSpeaking: false,
  ttsEnabled: false,

  setMode: (mode) => set({ mode }),
  setInput: (currentInput) => set({ currentInput }),
  setPendingImage: (pendingImage) => set({ pendingImage }),

  addUserMessage: (content, image) => {
    const id = generateId();
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: 'user',
          content,
          imagePreview: image?.preview,
          imageBase64: image?.base64,
          imageMimeType: image?.mimeType,
          timestamp: Date.now(),
        },
      ],
      currentInput: '',
      pendingImage: null,
    }));
    return id;
  },

  addAssistantMessage: (id, content, meta) => {
    set((state) => ({
      messages: [
        ...state.messages.filter(m => m.id !== id),
        {
          id,
          role: 'assistant',
          content,
          timestamp: Date.now(),
          provider: meta?.provider,
          model: meta?.model,
          latencyMs: meta?.latencyMs,
          isLoading: false,
        },
      ],
    }));
  },

  setMessageLoading: (id, isLoading) => {
    set((state) => ({
      messages: state.messages.map(m => m.id === id ? { ...m, isLoading } : m),
    }));
  },

  setProcessing: (isProcessing) => set({ isProcessing }),
  setError: (error) => set({ error }),
  clearChat: () => set({ messages: [], error: null }),
  setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
  setConversationMemory: (conversationMemory) => set({ conversationMemory }),
  setListening: (isListening) => set({ isListening }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  setTtsEnabled: (ttsEnabled) => set({ ttsEnabled }),
}));
