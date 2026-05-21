import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Shield, Key, Server, Cpu, History, Globe, Plus, Trash2 } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProviderStatus {
  id: string;
  name: string;
  totalKeys: number;
  activeKey: number;
  keysAvailable: number;
  keysOnCooldown: number;
}

interface LogEntry {
  id: string;
  type?: string;
  event?: string;
  email: string;
  ip: string;
  timestamp: any;
  userAgent?: string;
  details?: Record<string, any>;
}

export const SystemMonitorApp: React.FC = () => {
  const { isOwner, user } = useAuth();
  const [aiStatus, setAiStatus] = useState<ProviderStatus[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // IP Whitelist state
  const [whitelistedIPs, setWhitelistedIPs] = useState<Array<{id: string; ip: string; label: string}>>([]);
  const [myIP, setMyIP] = useState('');
  const [newIPInput, setNewIPInput] = useState('');
  const [newIPLabel, setNewIPLabel] = useState('');
  const [ipLoading, setIpLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch AI Status periodically
  useEffect(() => {
    if (!isOwner) return;
    const fetchAIStatus = async () => {
      try {
        const token = await user?.getIdToken();
        const res = await fetch('/api/system/status', {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        const json = await res.json();
        if (json.success && json.data?.providers) {
          setAiStatus(json.data.providers);
        }
      } catch (err) {
        console.error('Failed to fetch AI status:', err);
      }
    };

    fetchAIStatus();
    const interval = setInterval(fetchAIStatus, 5000);
    return () => clearInterval(interval);
  }, [isOwner, user]);

  // System heartbeat — pings Firestore every 60s to keep dashboard alive
  useEffect(() => {
    if (!isOwner) return;
    const pingHeartbeat = () => {
      fetch('/api/system/heartbeat').catch(() => {});
    };
    pingHeartbeat();
    const hbInterval = setInterval(pingHeartbeat, 60000);
    return () => clearInterval(hbInterval);
  }, [isOwner]);

  // Listen to Firestore Logs
  useEffect(() => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LogEntry[];
      setLogs(fetchedLogs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching logs:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOwner]);

  // Fetch IP whitelist
  const fetchWhitelist = useCallback(async () => {
    try {
      const [listRes, ipRes] = await Promise.all([
        fetch('/api/auth/check-ip?action=list'),
        fetch('/api/auth/check-ip?action=my-ip'),
      ]);
      const listData = await listRes.json();
      const ipData = await ipRes.json();
      if (listData.success) setWhitelistedIPs(listData.ips || []);
      if (ipData.success) setMyIP(ipData.ip || '');
    } catch (err) {
      console.error('Failed to fetch IP whitelist:', err);
    }
  }, []);

  useEffect(() => {
    if (!isOwner) return;
    fetchWhitelist();
  }, [isOwner, fetchWhitelist]);

  const handleAddIP = async () => {
    const ip = newIPInput.trim();
    if (!ip) return;
    setIpLoading(true);
    try {
      await fetch(`/api/auth/check-ip?action=add&ip=${encodeURIComponent(ip)}&label=${encodeURIComponent(newIPLabel || 'Custom')}`);
      setNewIPInput('');
      setNewIPLabel('');
      await fetchWhitelist();
    } catch { /* ignore */ }
    setIpLoading(false);
  };

  const handleAddMyIP = async () => {
    if (!myIP) return;
    setIpLoading(true);
    try {
      await fetch(`/api/auth/check-ip?action=add&ip=${encodeURIComponent(myIP)}&label=${encodeURIComponent('My Device')}`);
      await fetchWhitelist();
    } catch { /* ignore */ }
    setIpLoading(false);
  };

  const handleRemoveIP = async (id: string) => {
    setIpLoading(true);
    try {
      await fetch(`/api/auth/check-ip?action=remove&id=${encodeURIComponent(id)}`);
      await fetchWhitelist();
    } catch { /* ignore */ }
    setIpLoading(false);
  };

  if (!isOwner) {
    return (
      <div className="h-full w-full bg-[#0a0a0c] flex flex-col items-center justify-center font-mono text-white/40 gap-4 p-8 text-center">
        <Shield size={40} className="text-red-500/50 animate-pulse" strokeWidth={1.5} />
        <h2 className="text-[12px] font-bold text-red-400/70 tracking-widest uppercase">ACCESS DENIED</h2>
        <p className="text-[11px] max-w-sm leading-relaxed text-white/30">
          The System Dashboard contains sensitive security logs and token configuration. Only the system owner has authorization to view this panel.
        </p>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(date);
  };

  return (
    <div className="h-full w-full bg-[#0a0a0c] flex flex-col font-mono text-white/80 overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-white/5 bg-[#0e0e11] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-white/60" />
          <h2 className="text-[13px] font-medium tracking-widest uppercase">System Dashboard</h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/40">
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" /> Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* AI Key Rotation Engine Status */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Cpu size={14} className="text-white/50" />
            <h3 className="text-[11px] tracking-widest text-white/50 uppercase">AI Token Engine</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {aiStatus.map((provider) => (
              <div key={provider.id} className="bg-[#121215] border border-white/5 rounded-lg p-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Server size={14} className="text-white/40" />
                    <span className="text-[13px] font-medium">{provider.name}</span>
                  </div>
                  <div className="text-[10px] px-2 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                    {provider.id === 'gemini' ? 'PRIMARY' : 'FALLBACK'}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] text-white/40 mb-1">
                      <span>Active Key</span>
                      <span>{provider.activeKey} / {provider.totalKeys}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white/60 transition-all duration-500" 
                        style={{ width: `${(provider.activeKey / provider.totalKeys) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1.5 text-white/40">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Available: {provider.keysAvailable}
                    </span>
                    {provider.keysOnCooldown > 0 && (
                      <span className="flex items-center gap-1.5 text-white/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400/80" />
                        Cooldown: {provider.keysOnCooldown}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {aiStatus.length === 0 && (
              <div className="col-span-2 p-6 text-center text-white/30 text-[12px] border border-dashed border-white/5 rounded-lg">
                Loading AI Engine status...
              </div>
            )}
          </div>
        </section>

        {/* Security / System Logs */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Shield size={14} className="text-white/50" />
            <h3 className="text-[11px] tracking-widest text-white/50 uppercase">Security Audit Log</h3>
          </div>
          
          <div className="bg-[#121215] border border-white/5 rounded-lg overflow-hidden flex flex-col">
            <div className="grid grid-cols-[100px_1fr_120px_150px] gap-4 px-4 py-2 border-b border-white/5 bg-white/[0.02] text-[10px] text-white/30 uppercase tracking-wider">
              <span>Time</span>
              <span>Event / Email</span>
              <span>IP Address</span>
              <span>Type</span>
            </div>
            
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-[11px] text-white/30">Syncing logs...</div>
              ) : logs.length === 0 ? (
                <div className="p-4 text-center text-[11px] text-white/30">No security events recorded.</div>
              ) : (
                <AnimatePresence initial={false}>
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <div key={log.id} className="flex flex-col border-b border-white/5 last:border-0">
                        <motion.div 
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          initial={{ opacity: 0, backgroundColor: 'rgba(255,255,255,0.05)' }}
                          animate={{ opacity: 1, backgroundColor: 'transparent' }}
                          className="grid grid-cols-[100px_1fr_120px_150px] gap-4 px-4 py-3 text-[11px] items-center hover:bg-white/[0.02] transition-colors cursor-pointer select-none"
                        >
                          <span className="text-white/40">{formatDate(log.timestamp)}</span>
                          <span className="text-white/70 truncate">{log.email || log.details?.email || 'System'}</span>
                          <span className="text-white/40 font-mono">{log.ip || log.details?.ip || 'Unknown'}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] w-fit border font-mono uppercase",
                            (log.type || log.event) === 'LOGIN_SUCCESS' ? "bg-white/10 text-white border-white/20" :
                            (log.type || log.event) === 'LOGIN_FAILED' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            (log.type || log.event) === 'PASSWORD_RESET' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            (log.type || log.event) === 'ACCOUNT_LOCKOUT' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                            (log.type || log.event) === 'ai_chat_completed' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                            "bg-white/5 text-white/50 border-white/10"
                          )}>
                            {((log.type || log.event || '') as string).replace(/_/g, ' ')}
                          </span>
                        </motion.div>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 bg-white/[0.01] border-t border-white/[0.02] text-[10px] space-y-2 text-white/50 font-mono select-text">
                            {log.event === 'ai_chat_completed' ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-4 text-white/30 text-[9px] uppercase tracking-wider border-b border-white/5 pb-1">
                                  <span>Model: {String(log.details?.model || 'Unknown')} ({String(log.details?.providerId || 'Unknown')})</span>
                                  <span className="text-right">Latency: {String(log.details?.latencyMs || 0)}ms | Tokens: {String(log.details?.tokensUsed || 0)}</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-white/20 text-[9px] uppercase tracking-wider block">User Input:</span>
                                  <div className="bg-black/20 border border-white/5 p-2 rounded max-h-[80px] overflow-y-auto whitespace-pre-wrap select-all">
                                    {String(log.details?.input || '')}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-purple-400/30 text-[9px] uppercase tracking-wider block">AI Output:</span>
                                  <div className="bg-black/20 border border-purple-500/5 p-2 rounded max-h-[120px] overflow-y-auto whitespace-pre-wrap select-all text-white/70">
                                    {String(log.details?.output || '')}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <pre className="bg-black/20 p-2 rounded max-h-[150px] overflow-y-auto text-white/40">
                                {JSON.stringify(log.details || log, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </section>

        {/* IP Whitelist Manager */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Globe size={14} className="text-white/50" />
            <h3 className="text-[11px] tracking-widest text-white/50 uppercase">IP Whitelist</h3>
            {myIP && (
              <span className="ml-auto text-[10px] text-white/25 font-mono">Your IP: {myIP}</span>
            )}
          </div>

          <div className="bg-[#121215] border border-white/5 rounded-lg p-4 space-y-3">
            {/* Current whitelist */}
            {whitelistedIPs.length === 0 ? (
              <div className="text-[11px] text-white/25 text-center py-2">
                No IP restrictions — all IPs can login.
              </div>
            ) : (
              <div className="space-y-1">
                {whitelistedIPs.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 group">
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-mono text-white/60">{entry.ip}</span>
                      <span className="text-[10px] text-white/25">{entry.label}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveIP(entry.id)}
                      disabled={ipLoading}
                      className="text-white/10 hover:text-red-400/60 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add IP controls */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <button
                onClick={handleAddMyIP}
                disabled={ipLoading || !myIP}
                className="text-[10px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/40 hover:text-white/60 transition-all disabled:opacity-30 whitespace-nowrap"
              >
                + Add My IP
              </button>
              <input
                type="text"
                value={newIPInput}
                onChange={e => setNewIPInput(e.target.value)}
                placeholder="Custom IP"
                className="flex-1 h-7 px-2 bg-white/[0.03] border border-white/[0.06] rounded text-[11px] text-white/50 outline-none placeholder-white/15 focus:border-white/15"
              />
              <input
                type="text"
                value={newIPLabel}
                onChange={e => setNewIPLabel(e.target.value)}
                placeholder="Label"
                className="w-24 h-7 px-2 bg-white/[0.03] border border-white/[0.06] rounded text-[11px] text-white/50 outline-none placeholder-white/15 focus:border-white/15"
              />
              <button
                onClick={handleAddIP}
                disabled={ipLoading || !newIPInput.trim()}
                className="h-7 w-7 flex items-center justify-center rounded bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/40 hover:text-white/60 transition-all disabled:opacity-30"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
