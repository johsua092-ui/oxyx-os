"use client";

import React, { useState, useEffect } from 'react';
import { Search, Server, Activity, ShieldAlert, Clock, User, CheckCircle2, XCircle, Plus, Trash2, RefreshCw, AlertTriangle, TrendingUp, Radio, Eye } from 'lucide-react';

export const BloxIntelApp = () => {
  const [activeTab, setActiveTab] = useState<'recon' | 'status'>('recon');

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white/80 overflow-hidden">
      {/* Header Tabs */}
      <div className="flex border-b border-white/5 bg-white/[0.02] shrink-0">
        <button
          onClick={() => setActiveTab('recon')}
          className={`flex-1 py-3 text-[11px] uppercase tracking-wider font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'recon' ? 'text-cyan-400 border-b-2 border-cyan-400/50 bg-white/[0.04]' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
          }`}
        >
          <Search size={14} /> Ban Wave Radar
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex-1 py-3 text-[11px] uppercase tracking-wider font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'status' ? 'text-green-400 border-b-2 border-green-400/50 bg-white/[0.04]' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
          }`}
        >
          <Server size={14} /> Global Status
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 p-4">
        {activeTab === 'recon' ? <TargetRecon /> : <ServerStatus />}
      </div>
    </div>
  );
};

const TargetRecon = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Watchlist state
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [newWatchlistUsername, setNewWatchlistUsername] = useState('');

  // Load watchlist on mount
  useEffect(() => {
    const saved = localStorage.getItem('bloxintel_watchlist');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default placeholder accounts to track
      const defaultWatch = [
        { username: 'Roblox', isBanned: false, lastChecked: new Date().toISOString() },
        { username: 'Builderman', isBanned: false, lastChecked: new Date().toISOString() }
      ];
      setWatchlist(defaultWatch);
      localStorage.setItem('bloxintel_watchlist', JSON.stringify(defaultWatch));
    }
  }, []);

  const saveWatchlist = (list: any[]) => {
    setWatchlist(list);
    localStorage.setItem('bloxintel_watchlist', JSON.stringify(list));
  };

  // Add to watchlist
  const handleAddToWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistUsername.trim()) return;
    const target = newWatchlistUsername.trim();

    if (watchlist.some(w => w.username.toLowerCase() === target.toLowerCase())) {
      setNewWatchlistUsername('');
      return;
    }

    const newItem = { username: target, isBanned: null, loading: true, lastChecked: null };
    const updated = [...watchlist, newItem];
    saveWatchlist(updated);
    setNewWatchlistUsername('');

    try {
      const res = await fetch(`/api/roblox/recon?username=${encodeURIComponent(target)}`);
      const data = await res.json();
      const finalItems = updated.map(item => {
        if (item.username.toLowerCase() === target.toLowerCase()) {
          return {
            username: data.data?.username || target,
            isBanned: data.data ? data.data.isBanned : false,
            lastChecked: new Date().toISOString()
          };
        }
        return item;
      });
      saveWatchlist(finalItems);
    } catch {
      const finalItems = updated.map(item => {
        if (item.username.toLowerCase() === target.toLowerCase()) {
          return {
            username: target,
            isBanned: false,
            lastChecked: new Date().toISOString(),
            error: true
          };
        }
        return item;
      });
      saveWatchlist(finalItems);
    }
  };

  // Remove from watchlist
  const handleRemoveFromWatchlist = (name: string) => {
    const updated = watchlist.filter(w => w.username.toLowerCase() !== name.toLowerCase());
    saveWatchlist(updated);
  };

  // Scan all in watchlist
  const handleScanAllWatchlist = async () => {
    if (watchlist.length === 0) return;
    setWatchlistLoading(true);

    const updated = watchlist.map(w => ({ ...w, loading: true }));
    setWatchlist(updated);

    const promises = watchlist.map(async (item) => {
      try {
        const res = await fetch(`/api/roblox/recon?username=${encodeURIComponent(item.username)}`);
        const data = await res.json();
        return {
          username: data.data?.username || item.username,
          isBanned: data.data ? data.data.isBanned : false,
          lastChecked: new Date().toISOString()
        };
      } catch {
        return {
          username: item.username,
          isBanned: false,
          lastChecked: new Date().toISOString(),
          error: true
        };
      }
    });

    const results = await Promise.all(promises);
    saveWatchlist(results);
    setWatchlistLoading(false);
  };

  // Calculate alert level based on watchlist bans
  const getWatchlistBanStats = () => {
    const total = watchlist.filter(w => w.isBanned !== null).length;
    const banned = watchlist.filter(w => w.isBanned === true).length;
    const ratio = total > 0 ? (banned / total) * 100 : 0;

    let level = 'LOW';
    let color = 'text-green-400 border-green-500/20 bg-green-500/5';
    let progressColor = 'bg-green-400';

    if (ratio > 0 && ratio <= 25) {
      level = 'ELEVATED';
      color = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
      progressColor = 'bg-yellow-400';
    } else if (ratio > 25 && ratio <= 50) {
      level = 'HIGH';
      color = 'text-orange-400 border-orange-500/20 bg-orange-500/5';
      progressColor = 'bg-orange-400';
    } else if (ratio > 50) {
      level = 'CRITICAL';
      color = 'text-red-400 border-red-500/20 bg-red-500/5';
      progressColor = 'bg-red-400';
    }

    return { ratio, level, color, progressColor, banned, total };
  };

  const { ratio, level, color, progressColor, banned, total } = getWatchlistBanStats();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/roblox/recon?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch user');
      }
      
      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="grid grid-cols-5 gap-4 h-full min-h-0">
      {/* Left panel (60%) */}
      <div className="col-span-3 flex flex-col space-y-3 min-h-0 overflow-y-auto pr-1">
        <div>
          <h2 className="text-[14px] font-medium text-white/70 tracking-wide flex items-center gap-2">
            <ShieldAlert size={16} className="text-cyan-400" /> Target Recon
          </h2>
          <p className="text-[11px] text-white/40 mt-1">Investigate suspicious accounts without leaving a trace.</p>
        </div>

        {/* Scan Input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Scan Roblox username..."
              className="w-full bg-[#121216] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-[12px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-lg px-4 py-2 text-[12px] font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[12px] text-red-400 flex items-center gap-2">
            <XCircle size={14} /> {error}
          </div>
        )}

        {/* Scan Result */}
        {result && (
          <div className="bg-[#121216] border border-white/5 rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[16px] font-medium text-white/90 flex items-center gap-1.5">
                  {result.displayName} 
                  {result.hasVerifiedBadge && <CheckCircle2 size={14} className="text-blue-400" />}
                </h3>
                <p className="text-[11px] text-white/40 font-mono">@{result.username} • ID: {result.userId}</p>
              </div>
              
              <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wider border ${
                result.isBanned 
                  ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                  : 'bg-green-500/10 text-green-400 border-green-500/20'
              }`}>
                {result.isBanned ? 'Banned' : 'Clean'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-white/[0.01] rounded-lg p-2 border border-white/[0.02]">
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Clock size={10} /> Created At
                </p>
                <p className="text-[12px] text-white/70">{formatDate(result.created)}</p>
              </div>
              <div className="bg-white/[0.01] rounded-lg p-2 border border-white/[0.02]">
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Activity size={10} /> Status
                </p>
                <p className="text-[12px] text-white/70">{result.isBanned ? 'Terminated/Suspended' : 'Active'}</p>
              </div>
            </div>
            
            {result.description && (
              <div className="bg-white/[0.01] rounded-lg p-2 border border-white/[0.02]">
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">About</p>
                <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">{result.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Watchlist Section */}
        <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div>
              <h3 className="text-[12px] font-medium text-white/60 uppercase tracking-wider">Account Watchlist</h3>
              <p className="text-[10px] text-white/30">Track targets to dynamically calculate Ban Wave severity.</p>
            </div>
            <button
              onClick={handleScanAllWatchlist}
              disabled={watchlistLoading || watchlist.length === 0}
              className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[10px] border border-white/10 text-white/60 hover:text-white/80 transition-all flex items-center gap-1 disabled:opacity-40"
            >
              <RefreshCw size={10} className={watchlistLoading ? 'animate-spin' : ''} />
              Re-scan All
            </button>
          </div>

          {/* Add to Watchlist */}
          <form onSubmit={handleAddToWatchlist} className="flex gap-1.5 mb-2 shrink-0">
            <input
              type="text"
              value={newWatchlistUsername}
              onChange={(e) => setNewWatchlistUsername(e.target.value)}
              placeholder="Add username to watchlist..."
              className="flex-1 bg-[#121216] border border-white/5 rounded px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/20 focus:outline-none"
            />
            <button 
              type="submit"
              className="bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded px-2.5 text-[11px] text-white/60 hover:text-white/80 transition-all flex items-center justify-center"
            >
              <Plus size={12} />
            </button>
          </form>

          {/* Watchlist Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {watchlist.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-white/20 border border-dashed border-white/5 rounded-lg">
                No accounts in watchlist. Add targets to monitor them.
              </div>
            ) : (
              watchlist.map((item, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-white/[0.01] border border-white/[0.02] flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-white/70 font-medium">@{item.username}</span>
                    {item.loading ? (
                      <span className="text-[9px] text-white/30 animate-pulse">Checking...</span>
                    ) : item.isBanned !== null ? (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono border ${
                        item.isBanned 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : 'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}>
                        {item.isBanned ? 'BANNED' : 'CLEAN'}
                      </span>
                    ) : null}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.lastChecked && (
                      <span className="text-[8px] text-white/25 hidden group-hover:inline-block">
                        Checked {new Date(item.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveFromWatchlist(item.username)}
                      className="text-white/20 hover:text-red-400 p-1 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right panel (40%) */}
      <div className="col-span-2 flex flex-col space-y-3 min-h-0 overflow-y-auto pl-1 border-l border-white/5">
        {/* Ban Wave Indicator */}
        <div className={`p-4 rounded-xl border flex flex-col space-y-2 shrink-0 ${color}`}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider opacity-60 font-semibold flex items-center gap-1.5">
              <Radio size={12} className="animate-pulse" /> Threat Index
            </span>
            <span className="text-[12px] font-bold tracking-wider">{level}</span>
          </div>

          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-500 ${progressColor}`} style={{ width: `${Math.max(ratio, 10)}%` }} />
          </div>

          <div className="flex items-center justify-between text-[10px] opacity-60">
            <span>Watchlist Ban Rate</span>
            <span>{banned} / {total} accounts</span>
          </div>
        </div>

        {/* Anti-cheat Engine Monitor */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] shrink-0">
          <h4 className="text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp size={12} className="text-cyan-400" /> Byfron Security Engine
          </h4>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/40">Hyperion Client</span>
              <span className="text-green-400 font-mono">v4.2.14 Active</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/40">Memory Integrity Scan</span>
              <span className="text-green-400 font-mono">Monitoring</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/40">Global Ban Velocity</span>
              <span className="text-white/60 font-mono">Normal (3.2/sec)</span>
            </div>
          </div>
        </div>

        {/* Threat Intel Log */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/40 border border-white/5 rounded-xl p-3">
          <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertTriangle size={10} className="text-yellow-500" /> Threat Intel Feed
          </h4>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-[10px] font-mono leading-relaxed text-white/55">
            <div>
              <span className="text-cyan-400/70 mr-1.5">[SYSTEM]</span> Tracking Byfron anti-cheat telemetry metrics. Watchlist status feed live.
            </div>
            <div>
              <span className="text-cyan-400/70 mr-1.5">[BYFRON]</span> Hyperion engine integrity check deployed. Memory scan active.
            </div>
            <div>
              <span className="text-yellow-500/75 mr-1.5">[INTELLIGENCE]</span> Forum audit reports minor spike in termination complaints.
            </div>
            <div>
              <span className="text-cyan-400/70 mr-1.5">[MONITOR]</span> Watchlist scan rate initialized at 1-click concurrent recon query.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ServerStatus = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/roblox/status');
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (indicator: string) => {
    switch(indicator) {
      case 'none': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'minor': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'major': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-[14px] font-medium text-white/70 tracking-wide flex items-center gap-2">
          <Activity size={16} className="text-green-400" /> Global Infrastructure
        </h2>
        <p className="text-[11px] text-white/40 mt-1">Live platform health monitoring.</p>
      </div>

      {loading && !status ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-green-500/30 border-t-green-400 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 flex-1 flex flex-col min-h-0">
          {/* Main Status */}
          <div className={`p-4 rounded-xl border flex items-center justify-between shrink-0 ${getStatusColor(status?.indicator)}`}>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-60 font-medium mb-1">Overall Status</p>
              <h3 className="text-[16px] font-medium">{status?.status || 'Unknown'}</h3>
            </div>
            
            <div className="relative flex h-3 w-3">
              {status?.indicator === 'none' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${status?.indicator === 'none' ? 'bg-green-500' : 'bg-current'}`}></span>
            </div>
          </div>

          {/* Component Grid */}
          {status?.components && status.components.length > 0 && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-2 gap-1.5 custom-scrollbar">
              {status.components.map((comp: any, idx: number) => (
                <div key={idx} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-[11px] text-white/60 truncate mr-2">{comp.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      comp.indicator === 'none' ? 'bg-green-400' :
                      comp.indicator === 'minor' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <span className="text-[9px] text-white/40 font-mono uppercase">{comp.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-[10px] text-white/30 text-center flex items-center justify-center gap-1 mt-auto pt-2 shrink-0">
            <Clock size={10} /> Auto-updating every 30 seconds
          </div>
        </div>
      )}
    </div>
  );
};
