// ─────────────────────────────────────────────────────────────
// Oxyx OS / API / Music Search
// Strategy: Deezer for metadata (album art, artist) +
//           YouTube search for video IDs (full playback).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import YouTube from 'youtube-sr';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  try {
    // Search YouTube for full songs
    const videos = await YouTube.search(`${query} audio`, {
      limit: 15,
      type: 'video',
      safeSearch: false,
    });

    const items = videos
      .filter(v => v.id && v.title)
      .map(v => ({
        id: v.id!,
        title: v.title || '',
        artist: v.channel?.name || '',
        thumbnail: v.thumbnail?.url || '',
        duration: v.duration || 0,
        durationFormatted: v.durationFormatted || '',
        youtubeId: v.id!,
      }));

    return NextResponse.json({ items });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: msg, items: [] }, { status: 500 });
  }
}
