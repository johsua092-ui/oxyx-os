"use client";

import React, { useEffect, useState } from 'react';
import { Taskbar } from './Taskbar';
import { WindowManager } from './WindowManager';
import { motion, AnimatePresence } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import { Shield, Cpu, Wifi, Activity, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// ─── Clock Widget ───────────────────────────────────────────
const ClockWidget: React.FC = () => {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date()); // Set initial time only on client
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return <div className="text-right h-[70px]" />; // Placeholder during SSR

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="text-right">
      <div className="flex items-baseline gap-1 justify-end">
        <span className="text-[48px] font-extralight text-white/80 tracking-tight leading-none">{hours}</span>
        <span className="text-[48px] font-extralight text-white/30 tracking-tight leading-none animate-pulse">:</span>
        <span className="text-[48px] font-extralight text-white/80 tracking-tight leading-none">{minutes}</span>
        <span className="text-[20px] font-light text-white/30 tracking-tight leading-none ml-1">{seconds}</span>
      </div>
      <p className="text-[12px] text-white/35 tracking-wider mt-2 uppercase">{dateStr}</p>
    </div>
  );
};

// ─── System Status Widget ───────────────────────────────────
const SystemWidget: React.FC = () => {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setUptime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const stats = [
    { icon: Shield, label: 'Security', value: 'Active', color: 'text-emerald-400/70' },
    { icon: Cpu, label: 'AI Engine', value: 'Online', color: 'text-sky-400/70' },
    { icon: Wifi, label: 'Network', value: 'Connected', color: 'text-teal-400/70' },
    { icon: Activity, label: 'Uptime', value: formatUptime(uptime), color: 'text-amber-400/70' },
  ];

  return (
    <div className="space-y-2">
      {stats.map(({ icon: Icon, label, value, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 + i * 0.1 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]"
        >
          <Icon size={14} strokeWidth={1.5} className={color} />
          <span className="text-[11px] text-white/50 flex-1">{label}</span>
          <span className="text-[11px] text-white/60 font-mono">{value}</span>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Desktop Component ──────────────────────────────────────
export const Desktop: React.FC = () => {
  const { isBooting, completeBoot } = useOSStore();
  const { user } = useAuth();
  const [bootPhase, setBootPhase] = useState(0);

  const handleLogout = () => signOut(auth);

  useEffect(() => {
    if (!isBooting) return;

    const phases = [
      setTimeout(() => setBootPhase(1), 400),
      setTimeout(() => setBootPhase(2), 1200),
      setTimeout(() => setBootPhase(3), 2200),
      setTimeout(() => {
        setBootPhase(4);
        completeBoot();
      }, 3200),
    ];

    return () => phases.forEach(clearTimeout);
  }, [isBooting, completeBoot]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black selection:bg-white/20 text-white/80">
      {/* Dynamic Wallpaper — Dark Charcoal + Warm Slate */}
      <div className="absolute inset-0 z-0">
        {/* Base: rich dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#121418] via-[#0e1015] to-[#0a0b0e]" />

        {/* Top-left warm slate glow */}
        <motion.div 
          className="absolute rounded-full blur-[200px]"
          style={{ width: '60vw', height: '60vw', top: '-15%', left: '-10%', background: 'linear-gradient(135deg, #1c1f26, #252830)' }}
          animate={{ x: [0, 20, -10, 0], y: [0, 15, -8, 0] }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        />

        {/* Center-right subtle warmth */}
        <motion.div 
          className="absolute rounded-full blur-[180px]"
          style={{ width: '45vw', height: '45vw', top: '25%', right: '-8%', background: 'linear-gradient(200deg, #1a1d24, #1f2229)' }}
          animate={{ x: [0, -15, 10, 0], y: [0, -10, 18, 0] }}
          transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
        />

        {/* Bottom deep */}
        <motion.div 
          className="absolute rounded-full blur-[170px]"
          style={{ width: '50vw', height: '50vw', bottom: '-20%', left: '25%', background: 'linear-gradient(45deg, #14161c, #181b22)' }}
          animate={{ x: [0, 12, -18, 0], y: [0, -12, 8, 0] }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        />

        {/* Corner vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(0,0,0,0.4)_100%)]" />

        {/* Film grain */}
        <div 
          className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px'
          }}
        />
      </div>

      {/* Boot Sequence */}
      <AnimatePresence>
        {isBooting && (
          <motion.div 
            className="absolute inset-0 z-[99999] bg-black flex flex-col items-center justify-center"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: bootPhase >= 1 ? 1 : 0 }}
              transition={{ duration: 1 }}
              className="relative mb-10"
            >
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-white">
                <motion.path
                  d="M24 4L4 14v20l20 10 20-10V14L24 4z"
                  stroke="currentColor" strokeWidth="1" fill="none"
                  initial={{ pathLength: 0, opacity: 0.3 }}
                  animate={{ pathLength: bootPhase >= 1 ? 1 : 0, opacity: bootPhase >= 1 ? 0.5 : 0.3 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
                <motion.path
                  d="M24 4v40M4 14l20 10 20-10M4 34l20-10 20 10"
                  stroke="currentColor" strokeWidth="0.5" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: bootPhase >= 2 ? 1 : 0, opacity: bootPhase >= 2 ? 0.3 : 0 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                />
              </svg>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: bootPhase >= 1 ? 1 : 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-center"
            >
              <h1 className="text-[22px] font-light tracking-[0.4em] text-white/80 mb-1">OXYX</h1>
              <p className="text-[10px] tracking-[0.3em] text-white/15 uppercase">Operating System</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: bootPhase >= 2 ? 1 : 0 }}
              transition={{ duration: 0.5 }}
              className="mt-12 w-40"
            >
              <div className="h-[1px] bg-white/[0.06] w-full overflow-hidden rounded-full">
                <motion.div 
                  className="h-full bg-white/30"
                  initial={{ width: "0%" }}
                  animate={{ width: bootPhase >= 3 ? "100%" : bootPhase >= 2 ? "60%" : "0%" }}
                  transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
              <motion.p
                className="text-[9px] text-white/10 text-center mt-3 font-mono tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: bootPhase >= 2 ? 1 : 0 }}
              >
                {bootPhase >= 3 ? 'READY' : bootPhase >= 2 ? 'INITIALIZING' : ''}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OS Desktop Content */}
      <motion.div 
        className="relative z-10 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: isBooting ? 0 : 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {/* Desktop Widgets */}
        <div className="absolute top-8 right-8 z-[5] flex flex-col items-end gap-5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <ClockWidget />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="w-[220px]"
          >
            <SystemWidget />
          </motion.div>
        </div>

        {/* Welcome Text + Logout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute top-10 left-10 z-[5]"
        >
          <p className="text-[11px] text-white/30 tracking-[0.3em] uppercase mb-2">Welcome back</p>
          <h1 className="text-[28px] font-extralight text-white/70 tracking-wide">
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-[11px] text-white/30 mt-1 max-w-[200px] leading-relaxed">
            Your workspace is ready. All systems operational.
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 transition-all group"
          >
            <LogOut size={10} className="text-white/30 group-hover:text-white/50" />
            <span className="text-[9px] text-white/30 group-hover:text-white/50 tracking-wider">Sign Out</span>
          </button>
        </motion.div>

        <WindowManager />
        <Taskbar />
      </motion.div>
    </div>
  );
};
