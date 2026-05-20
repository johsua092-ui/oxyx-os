// ─────────────────────────────────────────────────────────────
// Oxyx OS / Core Engine / AI / DeepSeek Provider
// Handles all communication with DeepSeek API (OpenAI-compatible).
// Used as additional fallback in the AI provider chain.
// ─────────────────────────────────────────────────────────────

import {
  AIProviderInterface,
  AIProviderConfig,
  AIRequestPayload,
  AIResponsePayload,
} from '../types';

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';

export class DeepSeekProvider implements AIProviderInterface {
  config: AIProviderConfig;

  constructor(keys: string[]) {
    this.config = {
      id: 'deepseek',
      name: 'DeepSeek',
      keys,
      models: ['deepseek-chat', 'deepseek-reasoner'],
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

    const response = await fetch(DEEPSEEK_ENDPOINT, {
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

      if (response.status === 429 || response.status === 402 || response.status === 403) {
        throw new Error(`RATE_LIMITED: ${errorMessage}`);
      }
      throw new Error(`DEEPSEEK_ERROR: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content || '';
    const latencyMs = Date.now() - startTime;

    return {
      content,
      providerId: 'deepseek',
      model: this.currentModel,
      tokensUsed: data.usage?.total_tokens,
      latencyMs,
    };
  }

  async analyzeImage(payload: AIRequestPayload): Promise<AIResponsePayload> {
    // DeepSeek does not support vision — delegate to text-only analysis
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
