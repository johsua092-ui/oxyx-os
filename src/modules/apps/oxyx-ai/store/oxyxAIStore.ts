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

interface OxyxAIState {
  messages: ChatMessage[];
  mode: OxyxMode;
  isProcessing: boolean;
  currentInput: string;
  pendingImage: { preview: string; base64: string; mimeType: string } | null;
  error: string | null;

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
}));
