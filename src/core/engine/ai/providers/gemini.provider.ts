// ─────────────────────────────────────────────────────────────
// Oxyx OS / Core Engine / AI / Gemini Provider
// Handles all communication with Google Gemini API.
// Supports text chat and multimodal (vision) analysis.
// ─────────────────────────────────────────────────────────────

import {
  AIProviderInterface,
  AIProviderConfig,
  AIRequestPayload,
  AIResponsePayload,
} from '../types';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiProvider implements AIProviderInterface {
  config: AIProviderConfig;

  constructor(keys: string[]) {
    this.config = {
      id: 'gemini',
      name: 'Google Gemini',
      keys,
      models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'],
      currentKeyIndex: 0,
      currentModelIndex: 0,
      supportsVision: true,
      maxRetries: 3,
    };
  }

  rotateKey(): boolean {
    const nextIndex = this.config.currentKeyIndex + 1;
    if (nextIndex >= this.config.keys.length) {
      return false; // All keys exhausted
    }
    this.config.currentKeyIndex = nextIndex;
    return true;
  }

  private rotateModel(): boolean {
    const nextIndex = this.config.currentModelIndex + 1;
    if (nextIndex >= this.config.models.length) {
      this.config.currentModelIndex = 0;
      return false;
    }
    this.config.currentModelIndex = nextIndex;
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

    // Build Gemini-specific request body
    const contents = payload.messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

    // Add system instruction if present
    const systemInstruction = payload.systemPrompt
      ? { parts: [{ text: payload.systemPrompt }] }
      : undefined;

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: payload.temperature ?? 0.7,
        maxOutputTokens: payload.maxTokens ?? 4096,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const url = `${GEMINI_ENDPOINT}/${this.currentModel}:generateContent?key=${this.currentKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText;

      // If rate limited (429) or quota exceeded, try rotating
      if (response.status === 429 || response.status === 403) {
        throw new Error(`RATE_LIMITED: ${errorMessage}`);
      }
      throw new Error(`GEMINI_ERROR: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: { totalTokenCount?: number };
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const latencyMs = Date.now() - startTime;

    return {
      content,
      providerId: 'gemini',
      model: this.currentModel,
      tokensUsed: data.usageMetadata?.totalTokenCount,
      latencyMs,
    };
  }

  async analyzeImage(payload: AIRequestPayload): Promise<AIResponsePayload> {
    const startTime = Date.now();

    // Find the message with image data
    const imageMessage = payload.messages.find(m => m.imageBase64);
    const textMessage = payload.messages[payload.messages.length - 1];

    if (!imageMessage?.imageBase64) {
      throw new Error('No image data provided for analysis');
    }

    const parts: Array<Record<string, unknown>> = [
      {
        inline_data: {
          mime_type: imageMessage.imageMimeType || 'image/jpeg',
          data: imageMessage.imageBase64,
        },
      },
      { text: textMessage.content },
    ];

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: payload.temperature ?? 0.4,
        maxOutputTokens: payload.maxTokens ?? 4096,
      },
    };

    if (payload.systemPrompt) {
      (body as Record<string, unknown>).systemInstruction = {
        parts: [{ text: payload.systemPrompt }],
      };
    }

    // Use a vision-capable model
    const model = this.currentModel;
    const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${this.currentKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText;

      if (response.status === 429 || response.status === 403) {
        throw new Error(`RATE_LIMITED: ${errorMessage}`);
      }
      throw new Error(`GEMINI_VISION_ERROR: ${response.status} - ${errorMessage}`);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: { totalTokenCount?: number };
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const latencyMs = Date.now() - startTime;

    return {
      content,
      providerId: 'gemini',
      model,
      tokensUsed: data.usageMetadata?.totalTokenCount,
      latencyMs,
    };
  }
}
