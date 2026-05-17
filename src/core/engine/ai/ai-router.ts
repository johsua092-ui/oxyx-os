// ─────────────────────────────────────────────────────────────
// Oxyx OS / Core Engine / AI Router
// Intelligent request router with automatic provider failover.
// When a provider hits rate limits, the router automatically
// rotates keys and falls back to the next provider in the chain.
//
// Priority chain: Gemini (primary) → Groq (fallback)
// ─────────────────────────────────────────────────────────────

import { AIProviderInterface, AIRequestPayload, AIResponsePayload, AIProviderID } from './types';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';

export class AIRouter {
  private providers: Map<AIProviderID, AIProviderInterface> = new Map();
  private providerOrder: AIProviderID[] = ['gemini', 'groq'];
  private currentProviderIndex: number = 0;

  constructor() {
    // Collect all keys from environment variables
    const geminiKeys = this.collectKeys('GEMINI_API_KEY');
    const groqKeys = this.collectKeys('GROQ_API_KEY');

    if (geminiKeys.length > 0) {
      this.providers.set('gemini', new GeminiProvider(geminiKeys));
    }
    if (groqKeys.length > 0) {
      this.providers.set('groq', new GroqProvider(groqKeys));
    }

    // Filter providerOrder to only include initialized providers
    this.providerOrder = this.providerOrder.filter(id => this.providers.has(id));

    if (this.providerOrder.length === 0) {
      throw new Error('No AI providers configured. Check your .env.local file.');
    }
  }

  private collectKeys(prefix: string): string[] {
    const keys: string[] = [];
    // Support up to 20 stacked keys per provider
    for (let i = 1; i <= 20; i++) {
      const key = process.env[`${prefix}_${i}`];
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  private get activeProvider(): AIProviderInterface {
    const id = this.providerOrder[this.currentProviderIndex];
    return this.providers.get(id)!;
  }

  private switchToNextProvider(): boolean {
    const nextIndex = this.currentProviderIndex + 1;
    if (nextIndex >= this.providerOrder.length) {
      // All providers exhausted - reset all and start over
      this.currentProviderIndex = 0;
      for (const provider of this.providers.values()) {
        provider.config.currentKeyIndex = 0;
      }
      return false;
    }
    this.currentProviderIndex = nextIndex;
    return true;
  }

  async chat(payload: AIRequestPayload): Promise<AIResponsePayload> {
    return this.executeWithFallback('chat', payload);
  }

  async analyzeImage(payload: AIRequestPayload): Promise<AIResponsePayload> {
    // For image analysis, prefer a vision-capable provider
    const visionProvider = this.providerOrder.find(id => {
      const p = this.providers.get(id);
      return p?.config.supportsVision;
    });

    if (visionProvider) {
      // Temporarily set this as the starting provider
      const originalIndex = this.currentProviderIndex;
      this.currentProviderIndex = this.providerOrder.indexOf(visionProvider);
      try {
        return await this.executeWithFallback('analyzeImage', payload);
      } catch {
        this.currentProviderIndex = originalIndex;
        return this.executeWithFallback('analyzeImage', payload);
      }
    }

    return this.executeWithFallback('analyzeImage', payload);
  }

  private async executeWithFallback(
    method: 'chat' | 'analyzeImage',
    payload: AIRequestPayload,
    attempt: number = 0
  ): Promise<AIResponsePayload> {
    const maxTotalAttempts = this.providerOrder.length * 3; // 3 retries per provider

    if (attempt >= maxTotalAttempts) {
      throw new Error('All AI providers and keys exhausted. Please try again later.');
    }

    const provider = this.activeProvider;

    try {
      const result = await provider[method](payload);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `[AIRouter] Provider ${provider.config.id} failed (key ${provider.config.currentKeyIndex + 1}/${provider.config.keys.length}): ${errorMessage}`
      );

      if (errorMessage.includes('RATE_LIMITED')) {
        // Try rotating key within the same provider
        const rotated = provider.rotateKey();
        if (!rotated) {
          // All keys for this provider exhausted, switch provider
          const switched = this.switchToNextProvider();
          if (!switched) {
            throw new Error('All AI providers and keys exhausted. Please try again later.');
          }
        }
        return this.executeWithFallback(method, payload, attempt + 1);
      }

      // For non-rate-limit errors, try the next provider
      this.switchToNextProvider();
      return this.executeWithFallback(method, payload, attempt + 1);
    }
  }

  getStatus(): { providers: Array<{ id: string; name: string; activeKey: number; totalKeys: number }> } {
    return {
      providers: this.providerOrder.map(id => {
        const p = this.providers.get(id)!;
        return {
          id: p.config.id,
          name: p.config.name,
          activeKey: p.config.currentKeyIndex + 1,
          totalKeys: p.config.keys.length,
        };
      }),
    };
  }
}

// Singleton instance for use in API routes
let routerInstance: AIRouter | null = null;

export function getAIRouter(): AIRouter {
  if (!routerInstance) {
    routerInstance = new AIRouter();
  }
  return routerInstance;
}
