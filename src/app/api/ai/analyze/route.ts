// ─────────────────────────────────────────────────────────────
// Oxyx OS / API Route / AI Analyze (Vision)
// Handles image analysis requests for bounty hunting clues.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getAIRouter } from '@/core/engine/ai/ai-router';
import { AIMessage } from '@/core/engine/ai/types';

const ANALYSIS_SYSTEM_PROMPT = `You are Oxyx Vision, the visual analysis module of Oxyx OS. You specialize in analyzing screenshots, photos, and visual clues for cybersecurity reconnaissance, bug bounty hunting, and CTF challenges.

When analyzing an image:
1. First, describe exactly what you observe in the image
2. Identify any potential vulnerabilities, endpoints, tokens, or sensitive information visible
3. Suggest concrete next steps for exploitation or further reconnaissance
4. Rate the finding severity if applicable (Critical / High / Medium / Low / Informational)

Format your analysis cleanly using markdown headers and bullet points.
Always respond in the same language the user uses.
Never use emojis. Be precise and technical.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      messages?: AIMessage[];
      imageBase64?: string;
      imageMimeType?: string;
      prompt?: string;
    };

    // Build messages array with image data
    const messages: AIMessage[] = [];

    if (body.messages && Array.isArray(body.messages)) {
      messages.push(...body.messages);
    } else if (body.imageBase64 && body.prompt) {
      // Simple mode: just image + prompt
      messages.push({
        role: 'user',
        content: body.prompt,
        imageBase64: body.imageBase64,
        imageMimeType: body.imageMimeType || 'image/jpeg',
        timestamp: Date.now(),
      });
    } else {
      return NextResponse.json(
        { error: 'Either messages array or imageBase64 + prompt required.' },
        { status: 400 }
      );
    }

    const router = getAIRouter();

    const response = await router.analyzeImage({
      messages,
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 4096,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[API /ai/analyze] Error:', message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
