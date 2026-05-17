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
        <span className="text-[48px] font-extralight text-white/60 tracking-tight leading-none">{hours}</span>
        <span className="text-[48px] font-extralight text-white/15 tracking-tight leading-none animate-pulse">:</span>
        <span className="text-[48px] font-extralight text-white/60 tracking-tight leading-none">{minutes}</span>
        <span className="text-[20px] font-light text-white/15 tracking-tight leading-none ml-1">{seconds}</span>
      </div>
      <p className="text-[12px] text-white/15 tracking-wider mt-2 uppercase">{dateStr}</p>
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
    { icon: Shield, label: 'Security', value: 'Active', color: 'text-emerald-500/50' },
    { icon: Cpu, label: 'AI Engine', value: 'Online', color: 'text-blue-400/50' },
    { icon: Wifi, label: 'Network', value: 'Connected', color: 'text-cyan-400/50' },
    { icon: Activity, label: 'Uptime', value: formatUptime(uptime), color: 'text-purple-400/50' },
  ];

  return (
    <div className="space-y-2">
      {stats.map(({ icon: Icon, label, value, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1 + i * 0.1 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
        >
          <Icon size={14} strokeWidth={1.5} className={color} />
          <span className="text-[11px] text-white/25 flex-1">{label}</span>
          <span className="text-[11px] text-white/35 font-mono">{value}</span>
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
      {/* Dynamic Wallpaper */}
      <div className="absolute inset-0 z-0">
        {/* Base gradient - deep blue tint */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(15,23,42,0.9),rgba(0,0,0,1))]" />
        
        {/* Grid pattern - visible */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Horizon glow line */}
        <div className="absolute top-[35%] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute top-[35%] left-[20%] right-[20%] h-[80px] bg-gradient-to-b from-blue-500/[0.04] to-transparent blur-[40px]" />

        {/* Animated aurora blobs - brighter */}
        <motion.div 
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[180px] opacity-[0.12]"
          style={{ top: '5%', left: '15%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          animate={{ x: [0, 60, -30, 0], y: [0, 40, -20, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute w-[45vw] h-[45vw] rounded-full blur-[150px] opacity-[0.08]"
          style={{ bottom: '-5%', right: '5%', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)' }}
          animate={{ x: [0, -50, 30, 0], y: [0, -30, 40, 0] }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute w-[35vw] h-[35vw] rounded-full blur-[120px] opacity-[0.06]"
          style={{ top: '45%', left: '55%', background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
          animate={{ x: [0, 30, -40, 0], y: [0, -50, 20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />

        {/* Floating particles - bigger */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              top: `${8 + (i * 4.5) % 84}%`,
              left: `${3 + (i * 5.1) % 94}%`,
            }}
            animate={{
              y: [0, -(20 + i * 2), 0],
              opacity: [0.03, 0.2, 0.03],
            }}
            transition={{
              duration: 5 + (i % 5) * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          />
        ))}

        {/* Corner vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_30%,rgba(0,0,0,0.6)_100%)]" />

        {/* Film grain */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
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
          <p className="text-[11px] text-white/10 tracking-[0.3em] uppercase mb-2">Welcome back</p>
          <h1 className="text-[28px] font-extralight text-white/30 tracking-wide">
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-[11px] text-white/10 mt-1 max-w-[200px] leading-relaxed">
            Your workspace is ready. All systems operational.
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/10 transition-all group"
          >
            <LogOut size={10} className="text-white/15 group-hover:text-white/30" />
            <span className="text-[9px] text-white/15 group-hover:text-white/30 tracking-wider">Sign Out</span>
          </button>
        </motion.div>

        <WindowManager />
        <Taskbar />
      </motion.div>
    </div>
  );
};
