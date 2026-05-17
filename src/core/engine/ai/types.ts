// ─────────────────────────────────────────────────────────────
// Oxyx OS / Core Engine / AI Types
// Defines the contract for all AI providers in the system.
// ─────────────────────────────────────────────────────────────

export type AIProviderID = 'gemini' | 'groq';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageBase64?: string;    // For vision-capable models
  imageMimeType?: string;  // e.g. 'image/png', 'image/jpeg'
  timestamp: number;
}

export interface AIRequestPayload {
  messages: AIMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponsePayload {
  content: string;
  providerId: AIProviderID;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
}

export interface AIProviderConfig {
  id: AIProviderID;
  name: string;
  keys: string[];
  models: string[];
  currentKeyIndex: number;
  currentModelIndex: number;
  supportsVision: boolean;
  maxRetries: number;
}

export interface AIProviderInterface {
  readonly config: AIProviderConfig;
  chat(payload: AIRequestPayload): Promise<AIResponsePayload>;
  analyzeImage(payload: AIRequestPayload): Promise<AIResponsePayload>;
  rotateKey(): boolean; // returns false if all keys exhausted
}

export interface AIRouterState {
  providers: AIProviderConfig[];
  activeProviderId: AIProviderID;
  totalRequestsMade: number;
  totalFailures: number;
}
