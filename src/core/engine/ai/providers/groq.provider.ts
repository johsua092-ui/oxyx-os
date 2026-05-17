// ─────────────────────────────────────────────────────────────
// Oxyx OS / Core Engine / AI / Groq Provider
// Handles all communication with Groq API (OpenAI-compatible).
// Used as fallback when Gemini keys are exhausted.
// ─────────────────────────────────────────────────────────────

import {
  AIProviderInterface,
  AIProviderConfig,
  AIRequestPayload,
  AIResponsePayload,
} from '../types';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqProvider implements AIProviderInterface {
  config: AIProviderConfig;

  constructor(keys: string[]) {
    this.config = {
      id: 'groq',
      name: 'Groq',
      keys,
      models: ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'deepseek-r1-distill-llama-70b'],
      currentKeyIndex: 0,
      currentModelIndex: 0,
      supportsVision: false,
      maxRetries: 3,
    };
  }

  rotateKey(): boolean {
    const nextIndex = this.config.currentKeyIndex + 1;
    if (nextIndex >= this.config.keys.length) {
      return false;
    }
    this.config.currentKeyIndex = nextIndex;
    return true;
  }

  private get currentKey(): string {
    return this.config.keys[this.config.currentKeyIndex];
  }

  private get currentModel(): string {
    return this.config.models[this.config.currentModelIndex];
  }

  async chat(payload: AIRequestPayload): Promise<AIResponsePayload> {
    const startTime = Date.now();

    // Build OpenAI-compatible messages
    const messages: Array<{ role: string; content: string }> = [];

    if (payload.systemPrompt) {
      messages.push({ role: 'system', content: payload.systemPrompt });
    }

    for (const msg of payload.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    const body = {
      model: this.currentModel,
      messages,
      temperature: payload.temperature ?? 0.7,
      max_tokens: payload.maxTokens ?? 4096,
    };

    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.currentKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText;

      if (response.status === 429 || response.status === 403) {
        throw new Error(`RATE_LIMITED: ${errorMessage}`);
      }
      throw new Error(`GROQ_ERROR: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content || '';
    const latencyMs = Date.now() - startTime;

    return {
      content,
      providerId: 'groq',
      model: this.currentModel,
      tokensUsed: data.usage?.total_tokens,
      latencyMs,
    };
  }

  async analyzeImage(payload: AIRequestPayload): Promise<AIResponsePayload> {
    // Groq does not support vision - delegate to text-only analysis
    // Extract any text description and use that instead
    const textOnlyPayload: AIRequestPayload = {
      ...payload,
      messages: payload.messages.map(m => ({
        ...m,
        content: m.imageBase64
          ? `[User uploaded an image for analysis] ${m.content}`
          : m.content,
        imageBase64: undefined,
        imageMimeType: undefined,
      })),
      systemPrompt: (payload.systemPrompt || '') + 
        '\n\nNote: The user uploaded an image but the current model cannot process images directly. Acknowledge this and provide guidance based on the text context available.',
    };

    return this.chat(textOnlyPayload);
  }
}
