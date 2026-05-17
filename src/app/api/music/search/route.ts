// ─────────────────────────────────────────────────────────────
// Oxyx OS / API / Music Search
// Uses Deezer API for search (reliable, free, no auth).
// Returns metadata + constructs YouTube search embed URL.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=20`,
      { headers: { 'Accept': 'application/json' } }
    );

    const data = await res.json();

    const items = (data.data || []).map((track: Record<string, unknown>) => {
      const artist = track.artist as Record<string, unknown>;
      const album = track.album as Record<string, unknown>;
      const title = track.title as string;
      const artistName = artist?.name as string;

      return {
        id: track.id,
        title: title,
        artist: artistName,
        album: album?.title || '',
        cover: album?.cover_medium || album?.cover_small || '',
        duration: track.duration as number,
        preview: track.preview as string,
        // Build YouTube search query for full playback
        youtubeQuery: `${title} ${artistName}`,
      };
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: msg, items: [] }, { status: 500 });
  }
}
