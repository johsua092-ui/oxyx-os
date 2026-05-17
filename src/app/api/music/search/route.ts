// ─────────────────────────────────────────────────────────────
// Oxyx OS / API / Music Search
// Searches Spotify catalog using Client Credentials flow.
// Returns track IDs for embedding full songs.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Failed to get Spotify token');

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 60s early

  return cachedToken!;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  try {
    const token = await getSpotifyToken();

    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20&market=ID`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Spotify search failed');
    }

    const data = await res.json();

    const items = (data.tracks?.items || []).map((track: Record<string, unknown>) => {
      const artists = track.artists as Array<{ name: string }>;
      const album = track.album as { name: string; images: Array<{ url: string }> };

      return {
        id: track.id as string,
        title: track.name as string,
        artist: artists.map(a => a.name).join(', '),
        album: album.name,
        cover: album.images?.[1]?.url || album.images?.[0]?.url || '',
        duration: Math.floor((track.duration_ms as number) / 1000),
        spotifyId: track.id as string,
      };
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: msg, items: [] }, { status: 500 });
  }
}
