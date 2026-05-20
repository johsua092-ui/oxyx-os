// ─────────────────────────────────────────────────────────────
// Oxyx OS / Core Engine / AI Router
// Intelligent request router with round-robin key rotation
// and automatic provider failover.
//
// Key stacking: supports unlimited API keys per provider.
// Each key is tracked independently for cooldown.
// When one key hits rate limit → rotate to next key.
// When ALL keys for a provider are on cooldown → fallback.
//
// Priority chain: Gemini (primary) → Groq (fallback) → DeepSeek (fallback)
// ─────────────────────────────────────────────────────────────

import { AIProviderInterface, AIRequestPayload, AIResponsePayload, AIProviderID } from './types';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';

// Track cooldown per key
interface KeyStatus {
  key: string;
  cooldownUntil: number; // timestamp when key becomes available again
  failCount: number;
}

export class AIRouter {
  private providers: Map<AIProviderID, AIProviderInterface> = new Map();
  private providerOrder: AIProviderID[] = ['gemini', 'groq', 'deepseek'];
  private currentProviderIndex: number = 0;

  // Track key health per provider
  private keyStatus: Map<AIProviderID, KeyStatus[]> = new Map();

  constructor() {
    // Collect all keys from environment variables
    const geminiKeys = this.collectKeys('GEMINI_API_KEY');
    const groqKeys = this.collectKeys('GROQ_API_KEY');
    const deepseekKeys = this.collectKeys('DEEPSEEK_API_KEY');

    if (geminiKeys.length > 0) {
      this.providers.set('gemini', new GeminiProvider(geminiKeys));
      this.keyStatus.set('gemini', geminiKeys.map(k => ({
        key: k,
        cooldownUntil: 0,
        failCount: 0,
      })));
    }
    if (groqKeys.length > 0) {
      this.providers.set('groq', new GroqProvider(groqKeys));
      this.keyStatus.set('groq', groqKeys.map(k => ({
        key: k,
        cooldownUntil: 0,
        failCount: 0,
      })));
    }
    if (deepseekKeys.length > 0) {
      this.providers.set('deepseek', new DeepSeekProvider(deepseekKeys));
      this.keyStatus.set('deepseek', deepseekKeys.map(k => ({
        key: k,
        cooldownUntil: 0,
        failCount: 0,
      })));
    }

    // Filter providerOrder to only include initialized providers
    this.providerOrder = this.providerOrder.filter(id => this.providers.has(id));

    if (this.providerOrder.length === 0) {
      throw new Error('No AI providers configured. Check your .env.local file.');
    }
  }

  private collectKeys(prefix: string): string[] {
    const keys: string[] = [];
    // Support up to 50 stacked keys per provider
    for (let i = 1; i <= 50; i++) {
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

  private get activeProviderId(): AIProviderID {
    return this.providerOrder[this.currentProviderIndex];
  }

  // Find the best available key for the current provider
  private selectBestKey(): boolean {
    const providerId = this.activeProviderId;
    const statuses = this.keyStatus.get(providerId);
    if (!statuses) return false;

    const now = Date.now();

    // Find first key that's NOT on cooldown
    const availableIndex = statuses.findIndex(s => s.cooldownUntil <= now);
    if (availableIndex === -1) {
      return false; // All keys on cooldown
    }

    // Set the provider to use this key
    this.activeProvider.config.currentKeyIndex = availableIndex;
    return true;
  }

  // Mark current key as rate-limited with exponential cooldown
  private markKeyRateLimited(): void {
    const providerId = this.activeProviderId;
    const statuses = this.keyStatus.get(providerId);
    if (!statuses) return;

    const keyIndex = this.activeProvider.config.currentKeyIndex;
    const status = statuses[keyIndex];

    status.failCount += 1;
    // Exponential backoff: 30s, 60s, 120s, 240s, max 5min
    const cooldownMs = Math.min(30000 * Math.pow(2, status.failCount - 1), 300000);
    status.cooldownUntil = Date.now() + cooldownMs;
  }

  // Reset a key's cooldown on successful use
  private markKeySuccess(): void {
    const providerId = this.activeProviderId;
    const statuses = this.keyStatus.get(providerId);
    if (!statuses) return;

    const keyIndex = this.activeProvider.config.currentKeyIndex;
    statuses[keyIndex].failCount = 0;
    statuses[keyIndex].cooldownUntil = 0;
  }

  private switchToNextProvider(): boolean {
    const startIndex = this.currentProviderIndex;
    let nextIndex = (this.currentProviderIndex + 1) % this.providerOrder.length;

    // Try each provider
    while (nextIndex !== startIndex) {
      this.currentProviderIndex = nextIndex;
      if (this.selectBestKey()) {
        return true;
      }
      nextIndex = (nextIndex + 1) % this.providerOrder.length;
    }

    // All providers exhausted — force reset oldest cooldowns
    this.currentProviderIndex = 0;
    for (const statuses of this.keyStatus.values()) {
      for (const s of statuses) {
        s.cooldownUntil = 0;
        s.failCount = 0;
      }
    }
    return false;
  }

  async chat(payload: AIRequestPayload): Promise<AIResponsePayload> {
    return this.executeWithFallback('chat', payload);
  }

  // Force a specific provider (for Multi-Model Toggle)
  async chatWithProvider(providerId: AIProviderID, payload: AIRequestPayload): Promise<AIResponsePayload> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      // Provider not available, fall back to auto
      return this.chat(payload);
    }

    // Try the requested provider first
    const originalIndex = this.currentProviderIndex;
    this.currentProviderIndex = this.providerOrder.indexOf(providerId);

    try {
      if (!this.selectBestKey()) {
        // No keys available, fall back to auto
        this.currentProviderIndex = originalIndex;
        return this.chat(payload);
      }
      const result = await provider.chat(payload);
      this.markKeySuccess();
      return result;
    } catch {
      // Requested provider failed, fall back to auto chain
      this.currentProviderIndex = originalIndex;
      return this.executeWithFallback('chat', payload);
    }
  }

  async analyzeImage(payload: AIRequestPayload): Promise<AIResponsePayload> {
    // For image analysis, prefer a vision-capable provider
    const visionProvider = this.providerOrder.find(id => {
      const p = this.providers.get(id);
      return p?.config.supportsVision;
    });

    if (visionProvider) {
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
    const totalKeys = Array.from(this.keyStatus.values())
      .reduce((sum, s) => sum + s.length, 0);
    const maxAttempts = totalKeys * 2; // Try each key up to 2x

    if (attempt >= maxAttempts) {
      throw new Error('Service temporarily unavailable. All API keys exhausted. Please try again later.');
    }

    // Select best available key for current provider
    if (!this.selectBestKey()) {
      // No keys available for this provider, switch
      const switched = this.switchToNextProvider();
      if (!switched && attempt > 0) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
    }

    const provider = this.activeProvider;

    try {
      const result = await provider[method](payload);
      this.markKeySuccess();
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (process.env.NODE_ENV !== 'production') {
        const providerId = this.activeProviderId;
        const keyIndex = provider.config.currentKeyIndex + 1;
        const totalProviderKeys = provider.config.keys.length;
        console.error(
          `[AIRouter] ${providerId} key ${keyIndex}/${totalProviderKeys} failed: ${errorMessage}`
        );
      } else {
        console.error('[AIRouter] Provider failed, rotating...');
      }

      if (errorMessage.includes('RATE_LIMITED')) {
        this.markKeyRateLimited();

        // Try next key in same provider
        if (this.selectBestKey()) {
          return this.executeWithFallback(method, payload, attempt + 1);
        }

        // All keys for this provider on cooldown, switch provider
        this.switchToNextProvider();
        return this.executeWithFallback(method, payload, attempt + 1);
      }

      // For non-rate-limit errors, try the next provider directly
      this.switchToNextProvider();
      return this.executeWithFallback(method, payload, attempt + 1);
    }
  }

  // Status for debugging/dashboard
  getStatus() {
    const now = Date.now();
    return {
      providers: this.providerOrder.map(id => {
        const p = this.providers.get(id)!;
        const statuses = this.keyStatus.get(id) || [];
        return {
          id: p.config.id,
          name: p.config.name,
          totalKeys: p.config.keys.length,
          activeKey: p.config.currentKeyIndex + 1,
          keysAvailable: statuses.filter(s => s.cooldownUntil <= now).length,
          keysOnCooldown: statuses.filter(s => s.cooldownUntil > now).length,
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
