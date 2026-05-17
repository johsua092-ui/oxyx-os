"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Music Player
// Search via Spotify API → embed Spotify track = FULL songs.
// Also has curated Stations for browsing playlists.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Play, Pause, Music, Disc3,
  Radio, Headphones, Coffee, Zap, Moon, Flame
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────
interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  spotifyId: string;
}

interface Station {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  spotifyUri: string;
  color: string;
}

// ─── Curated Spotify Stations ───────────────────────────────
const STATIONS: Station[] = [
  { id: 'lofi', title: 'Deep Focus', subtitle: 'Lo-fi beats to concentrate', icon: <Coffee size={15} />, spotifyUri: '37i9dQZF1DWWQRwui0ExPn', color: 'rgba(99,102,241,0.15)' },
  { id: 'electronic', title: 'Electronic', subtitle: 'Synth atmospheres', icon: <Zap size={15} />, spotifyUri: '37i9dQZF1DX4dyzvuaRJ0n', color: 'rgba(6,182,212,0.15)' },
  { id: 'chill', title: 'Night Mode', subtitle: 'Late night vibes', icon: <Moon size={15} />, spotifyUri: '37i9dQZF1DWYcDQ1hSjOpY', color: 'rgba(139,92,246,0.15)' },
  { id: 'hiphop', title: 'Raw Power', subtitle: 'Hard-hitting hip-hop', icon: <Flame size={15} />, spotifyUri: '37i9dQZF1DX0XUsuxWHRQd', color: 'rgba(239,68,68,0.12)' },
  { id: 'radio', title: 'Global Radio', subtitle: 'Worldwide sounds', icon: <Radio size={15} />, spotifyUri: '37i9dQZF1DWVpEYOjSbGAF', color: 'rgba(234,179,8,0.12)' },
  { id: 'classical', title: 'Orchestral', subtitle: 'Cinematic scores', icon: <Disc3 size={15} />, spotifyUri: '37i9dQZF1DWWEJlAGA9gs0', color: 'rgba(168,85,247,0.12)' },
  { id: 'workout', title: 'Adrenaline', subtitle: 'Workout fuel', icon: <Headphones size={15} />, spotifyUri: '37i9dQZF1DX76Wlfdnj7AP', color: 'rgba(249,115,22,0.12)' },
  { id: 'indie', title: 'Indie Pulse', subtitle: 'Alternative gems', icon: <Music size={15} />, spotifyUri: '37i9dQZF1DX2Nc3B70tvx0', color: 'rgba(34,197,94,0.12)' },
];

// ─── Main Component ─────────────────────────────────────────
export const MusicApp: React.FC = () => {
  const [mode, setMode] = useState<'stations' | 'search'>('stations');
  const [activeStation, setActiveStation] = useState<Station>(STATIONS[0]);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) {
        setSearchError(data.error);
        setResults([]);
      } else if (data.items) {
        setResults(data.items);
        setMode('search');
      }
    } catch {
      setSearchError('Search failed');
      setResults([]);
    }
    setIsSearching(false);
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full w-full bg-[#060608] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01] px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center">
            <Music size={12} className="text-white/40" />
          </div>
          <span className="text-[12px] font-medium text-white/45">Oxyx Music</span>

          <div className="ml-auto flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
            <button onClick={() => setMode('stations')}
              className={`px-3 py-1 rounded-md text-[10px] transition-all ${mode === 'stations' ? 'bg-white/[0.08] text-white/50' : 'text-white/20 hover:text-white/30'}`}>
              Stations
            </button>
            <button onClick={() => setMode('search')}
              className={`px-3 py-1 rounded-md text-[10px] transition-all ${mode === 'search' ? 'bg-white/[0.08] text-white/50' : 'text-white/20 hover:text-white/30'}`}>
              Search
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-8 bg-white/[0.03] border border-white/5 rounded-lg flex items-center px-3 gap-2 focus-within:border-white/15 transition-colors">
            <Search size={12} className="text-white/15 shrink-0" />
            <input type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search any song on Spotify..."
              className="flex-1 bg-transparent text-[11px] text-white/50 outline-none placeholder-white/15" spellCheck={false} />
          </div>
          <button onClick={handleSearch} disabled={isSearching}
            className="h-8 px-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/8 rounded-lg text-[10px] text-white/40 transition-all disabled:opacity-30">
            {isSearching ? '...' : 'Go'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === 'stations' ? (
            <motion.div key="stations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full h-full">
              {/* Station List */}
              <div className="w-[200px] border-r border-white/5 overflow-y-auto py-2 px-2 shrink-0 space-y-1">
                <p className="text-[9px] text-white/10 tracking-wider uppercase px-2 mb-2">Full Songs · Playlists</p>
                {STATIONS.map((st, i) => (
                  <motion.button key={st.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setActiveStation(st)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all group
                      ${activeStation.id === st.id ? 'bg-white/[0.06] border border-white/8' : 'border border-transparent hover:bg-white/[0.03]'}`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                      style={{ backgroundColor: activeStation.id === st.id ? st.color : 'rgba(255,255,255,0.02)' }}>
                      <span className={activeStation.id === st.id ? 'text-white/50' : 'text-white/20 group-hover:text-white/30'}>{st.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[11px] truncate ${activeStation.id === st.id ? 'text-white/50' : 'text-white/25 group-hover:text-white/40'}`}>{st.title}</p>
                      <p className="text-[8px] text-white/10 truncate">{st.subtitle}</p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Spotify Embed */}
              <div className="flex-1 p-3">
                <iframe
                  key={activeStation.id}
                  src={`https://open.spotify.com/embed/playlist/${activeStation.spotifyUri}?utm_source=generator&theme=0`}
                  width="100%" height="100%" frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy" className="rounded-xl"
                  title={`Spotify: ${activeStation.title}`}
                />
              </div>
            </motion.div>
          ) : (
            // ─── Search Mode ────────────────────────────────────
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full h-full">
              {/* Track List */}
              <div className="w-[280px] border-r border-white/5 overflow-y-auto shrink-0">
                {searchError && (
                  <div className="px-4 py-3">
                    <p className="text-[10px] text-red-400/50">{searchError}</p>
                  </div>
                )}
                {results.length === 0 && !searchError ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Disc3 size={24} className="text-white/8" />
                    <p className="text-[10px] text-white/15">Search any song</p>
                    <p className="text-[8px] text-white/8">Powered by Spotify · Full songs</p>
                  </div>
                ) : (
                  <div className="py-2 px-2 space-y-0.5">
                    <p className="text-[9px] text-white/10 tracking-wider uppercase px-2 mb-1">Results · {results.length} tracks</p>
                    {results.map((track, i) => (
                      <motion.div key={track.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                        onClick={() => playTrack(track)}
                        className={`flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer group transition-all
                          ${currentTrack?.id === track.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                      >
                        <div className="relative w-9 h-9 rounded-md overflow-hidden shrink-0 bg-white/5">
                          {track.cover && <img src={track.cover} alt="" className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {currentTrack?.id === track.id
                              ? <Pause size={11} className="text-white/80" />
                              : <Play size={11} className="text-white/80 ml-0.5" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] truncate leading-tight ${currentTrack?.id === track.id ? 'text-white/60' : 'text-white/35 group-hover:text-white/50'}`}>
                            {track.title}
                          </p>
                          <p className="text-[9px] text-white/15 truncate">{track.artist}</p>
                        </div>
                        <span className="text-[9px] text-white/12 font-mono shrink-0">{fmt(track.duration)}</span>
                        {currentTrack?.id === track.id && (
                          <div className="flex items-center gap-[2px] shrink-0">
                            {[1, 2, 3].map((j) => (
                              <motion.div key={j} className="w-[2px] bg-white/30 rounded-full"
                                animate={{ height: [3, 9, 5, 11, 3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: j * 0.12 }} />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spotify Track Embed - FULL SONG */}
              <div className="flex-1 flex flex-col">
                {currentTrack ? (
                  <div className="flex-1 p-3">
                    <iframe
                      key={currentTrack.spotifyId}
                      src={`https://open.spotify.com/embed/track/${currentTrack.spotifyId}?utm_source=generator&theme=0`}
                      width="100%" height="100%" frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy" className="rounded-xl"
                      title={`${currentTrack.title} - ${currentTrack.artist}`}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                      <Music size={18} className="text-white/10" />
                    </div>
                    <p className="text-[11px] text-white/15">Select a track to play</p>
                    <p className="text-[9px] text-white/8">Full songs via Spotify</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
