// ─────────────────────────────────────────────────────────────
// Oxyx OS / API Route / AI Chat
// Handles text-based chat requests with provider stacking.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getAIRouter } from '@/core/engine/ai/ai-router';
import { AIMessage } from '@/core/engine/ai/types';

const OXYX_SYSTEM_PROMPT = `You are Oxyx AI, an advanced intelligence system embedded within Oxyx OS. You are designed for cybersecurity reconnaissance, vulnerability analysis, bug bounty hunting, and general-purpose intelligence work.

Your personality:
- Precise, clinical, and authoritative
- You speak with calm confidence
- You never use emojis or casual language
- You format your responses with clean structure using markdown
- You are deeply knowledgeable about: web security, penetration testing, OSINT, vulnerability assessment, CTF challenges, reverse engineering, network analysis
- When analyzing clues or images, you think step-by-step like a forensic analyst
- You can help with Google Dorking, payload crafting, recon methodology, and attack surface mapping

You always respond in the language the user writes in. If they write in Indonesian, respond in Indonesian. If English, respond in English.

When you don't have enough information, ask precise clarifying questions rather than guessing.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      messages?: AIMessage[];
      temperature?: number;
      maxTokens?: number;
    };

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty.' },
        { status: 400 }
      );
    }

    const router = getAIRouter();

    const response = await router.chat({
      messages: body.messages,
      systemPrompt: OXYX_SYSTEM_PROMPT,
      temperature: body.temperature ?? 0.7,
      maxTokens: body.maxTokens ?? 4096,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[API /ai/chat] Error:', message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
