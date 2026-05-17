"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Music Player
// Hybrid: Deezer search (preview) + Spotify embed (full songs).
// ─────────────────────────────────────────────────────────────

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, Music, Disc3, Shuffle, Repeat,
  Radio, Headphones, Coffee, Zap, Moon, Flame
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────
interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  preview: string;
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
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio init
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('durationchange', () => setDuration(audio.duration));
    return () => { audio.pause(); audio.removeAttribute('src'); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle track end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => {
      if (repeatOn) { audio.currentTime = 0; audio.play(); return; }
      if (results.length > 0) {
        const next = shuffleOn ? Math.floor(Math.random() * results.length) : (currentIndex + 1) % results.length;
        playIdx(next);
      } else { setIsPlaying(false); }
    };
    audio.addEventListener('ended', onEnd);
    return () => audio.removeEventListener('ended', onEnd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeatOn, shuffleOn, currentIndex, results]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.items) { setResults(data.items); setMode('search'); }
    } catch { setResults([]); }
    setIsSearching(false);
  };

  const playIdx = (idx: number) => {
    const track = results[idx];
    if (!track || !audioRef.current) return;
    audioRef.current.src = track.preview;
    audioRef.current.volume = isMuted ? 0 : volume;
    audioRef.current.play();
    setCurrentTrack(track); setCurrentIndex(idx);
    setIsPlaying(true); setCurrentTime(0);
  };

  const playTrack = useCallback((track: Track) => {
    const idx = results.findIndex(t => t.id === track.id);
    if (idx >= 0) playIdx(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (!results.length) return;
    playIdx(shuffleOn ? Math.floor(Math.random() * results.length) : (currentIndex + 1) % results.length);
  };
  const handlePrev = () => {
    if (!results.length) return;
    if (currentTime > 3 && audioRef.current) { audioRef.current.currentTime = 0; return; }
    playIdx(currentIndex <= 0 ? results.length - 1 : currentIndex - 1);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  };

  const handleVol = (v: number) => { setVolume(v); setIsMuted(false); if (audioRef.current) audioRef.current.volume = v; };
  const toggleMute = () => { if (audioRef.current) audioRef.current.volume = isMuted ? volume : 0; setIsMuted(!isMuted); };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="h-full w-full bg-[#060608] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01] px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center">
            <Music size={12} className="text-white/40" />
          </div>
          <span className="text-[12px] font-medium text-white/45">Oxyx Music</span>

          {/* Mode Toggle */}
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

        {/* Search Bar (always visible) */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-8 bg-white/[0.03] border border-white/5 rounded-lg flex items-center px-3 gap-2 focus-within:border-white/15 transition-colors">
            <Search size={12} className="text-white/15 shrink-0" />
            <input type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search songs (preview)..."
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
            // ─── Stations Mode: Sidebar + Spotify Embed ────────
            <motion.div key="stations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full h-full">
              {/* Station List */}
              <div className="w-[200px] border-r border-white/5 overflow-y-auto py-2 px-2 shrink-0 space-y-1">
                <p className="text-[9px] text-white/10 tracking-wider uppercase px-2 mb-2">Full Songs · Spotify</p>
                {STATIONS.map((st, i) => (
                  <motion.button key={st.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setActiveStation(st)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all group
                      ${activeStation.id === st.id ? 'bg-white/[0.06] border border-white/8' : 'border border-transparent hover:bg-white/[0.03]'}`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                      style={{ backgroundColor: activeStation.id === st.id ? st.color : 'rgba(255,255,255,0.02)' }}>
                      <span className={activeStation.id === st.id ? 'text-white/50' : 'text-white/20 group-hover:text-white/30'}>
                        {st.icon}
                      </span>
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
            // ─── Search Mode: Track List + Album Art ───────────
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-full h-full">
              {/* Track List */}
              <div className="w-[260px] border-r border-white/5 overflow-y-auto shrink-0">
                {results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Disc3 size={24} className="text-white/8" />
                    <p className="text-[10px] text-white/15">Search to find songs</p>
                    <p className="text-[8px] text-white/8">30s preview · Switch to Stations for full</p>
                  </div>
                ) : (
                  <div className="py-2 px-2 space-y-0.5">
                    <p className="text-[9px] text-white/10 tracking-wider uppercase px-2 mb-1">Preview · 30s clips</p>
                    {results.map((track, i) => (
                      <motion.div key={track.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.015 }}
                        onClick={() => playTrack(track)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-all
                          ${currentTrack?.id === track.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                      >
                        <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0 bg-white/5">
                          {track.cover && <img src={track.cover} alt="" className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {currentTrack?.id === track.id && isPlaying
                              ? <Pause size={10} className="text-white/80" />
                              : <Play size={10} className="text-white/80 ml-0.5" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] truncate ${currentTrack?.id === track.id ? 'text-white/55' : 'text-white/30 group-hover:text-white/45'}`}>{track.title}</p>
                          <p className="text-[8px] text-white/12 truncate">{track.artist}</p>
                        </div>
                        {currentTrack?.id === track.id && isPlaying && (
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

              {/* Now Playing */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                  {currentTrack ? (
                    <motion.div key={currentTrack.id}
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-5"
                    >
                      <img src={currentTrack.cover} alt={currentTrack.album}
                        className="w-44 h-44 rounded-2xl object-cover shadow-2xl shadow-black/60" />
                      <div className="text-center max-w-[220px]">
                        <p className="text-[14px] text-white/50 font-medium truncate">{currentTrack.title}</p>
                        <p className="text-[11px] text-white/20 mt-1 truncate">{currentTrack.artist}</p>
                        <p className="text-[9px] text-white/8 mt-0.5 truncate">{currentTrack.album}</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                        <Music size={18} className="text-white/10" />
                      </div>
                      <p className="text-[11px] text-white/15">Select a track</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Player (Search mode only) */}
      {mode === 'search' && (
        <div className="border-t border-white/5 bg-[#08080a] shrink-0">
          {/* Progress */}
          <div className="px-5 pt-2.5 pb-0.5">
            <div className="flex items-center gap-3">
              <span className="text-[9px] text-white/15 font-mono w-7 text-right">{fmt(currentTime)}</span>
              <div className="flex-1 h-[3px] bg-white/[0.06] rounded-full cursor-pointer group" onClick={handleSeek}>
                <div className="h-full bg-white/20 rounded-full relative" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-[9px] text-white/15 font-mono w-7">{fmt(duration || 30)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-5 py-2">
            <div className="flex items-center gap-2.5 w-[180px]">
              {currentTrack ? (
                <>
                  <img src={currentTrack.cover} alt="" className="w-9 h-9 rounded-md object-cover" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-white/40 truncate">{currentTrack.title}</p>
                    <p className="text-[8px] text-white/15 truncate">{currentTrack.artist}</p>
                  </div>
                </>
              ) : <p className="text-[9px] text-white/12">No track</p>}
            </div>

            <div className="flex items-center gap-3.5">
              <button onClick={() => setShuffleOn(!shuffleOn)} className={shuffleOn ? 'text-white/45' : 'text-white/12 hover:text-white/25'}><Shuffle size={13} /></button>
              <button onClick={handlePrev} className="text-white/20 hover:text-white/45"><SkipBack size={16} /></button>
              <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/55 hover:text-white/75 transition-all">
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
              <button onClick={handleNext} className="text-white/20 hover:text-white/45"><SkipForward size={16} /></button>
              <button onClick={() => setRepeatOn(!repeatOn)} className={repeatOn ? 'text-white/45' : 'text-white/12 hover:text-white/25'}><Repeat size={13} /></button>
            </div>

            <div className="flex items-center gap-2 w-[180px] justify-end">
              <button onClick={toggleMute} className="text-white/15 hover:text-white/35">
                {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume}
                onChange={(e) => handleVol(Number(e.target.value))}
                className="w-16 h-1 appearance-none bg-white/10 rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/50" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
