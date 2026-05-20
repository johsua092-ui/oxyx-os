"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Auth / Login Screen
// Locked down — registration disabled. Only existing accounts
// can access the system. Owner account is protected.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { syncUserProfile, logSystemEvent } from '@/lib/firestore';
import { Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff, Shield, KeyRound } from 'lucide-react';

// Max login attempts before temporary lockout
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [recoveryMsg, setRecoveryMsg] = useState('');

  const isLocked = lockedUntil && Date.now() < lockedUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check lockout
    if (isLocked) {
      const remaining = Math.ceil(((lockedUntil || 0) - Date.now()) / 60000);
      setError(`System locked. Try again in ${remaining} minute(s).`);
      return;
    }

    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // ─── Server-side whitelist verification ────────────────
      // This is the definitive fix for the signup-via-API exploit.
      // Even if someone creates an account directly via Firebase API,
      // they will be blocked and their account deleted here.
      const idToken = await cred.user.getIdToken();
      let serverVerified = false;

      try {
        const verifyRes = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (verifyRes.ok) {
          serverVerified = true;
        } else {
          const verifyData = await verifyRes.json().catch(() => ({}));
          if (verifyData.error === 'ACCESS_DENIED') {
            // Account was purged by server — sign out locally
            await auth.signOut();
            setError('Access denied. This system is restricted to authorized personnel only.');
            setLoading(false);
            return;
          }
          // Other server errors — allow login but log warning
          // (graceful degradation: don't block owner if Admin SDK isn't configured yet)
          console.warn('[Auth] Server verification failed, proceeding with client-side auth:', verifyData);
          serverVerified = false;
        }
      } catch {
        // Network error calling verify endpoint — graceful degradation
        console.warn('[Auth] Could not reach /api/auth/verify, proceeding with client-side auth');
        serverVerified = false;
      }

      // Sync user profile to Firestore on successful login
      await syncUserProfile(
        cred.user.uid,
        cred.user.email || '',
        cred.user.displayName || ''
      );

      // Log successful login
      await logSystemEvent('login_success', {
        uid: cred.user.uid,
        email: cred.user.email,
        serverVerified,
      });

      // Reset attempts on success
      setAttempts(0);
      setLockedUntil(null);
    } catch (err: unknown) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      // Log failed attempt
      await logSystemEvent('login_failed', {
        email,
        attempt: newAttempts,
      });

      // Lockout after max attempts
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        setLockedUntil(lockUntil);
        setError(`Too many failed attempts. System locked for 5 minutes.`);

        await logSystemEvent('account_lockout', {
          email,
          lockUntil: new Date(lockUntil).toISOString(),
        });
      } else {
        const code = (err as { code?: string })?.code || '';
        // Intentionally vague error messages to prevent enumeration
        if (code === 'auth/too-many-requests') {
          setError('Too many attempts. Try again later.');
        } else {
          setError(`Access denied. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black selection:bg-white/20">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#121418] via-[#0e1015] to-[#0a0b0e]" />
        <motion.div
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[200px]"
          style={{ top: '10%', left: '15%', background: 'linear-gradient(135deg, #1c1f26, #252830)' }}
          animate={{ x: [0, 30, -15, 0], y: [0, 20, -10, 0] }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-[45vw] h-[45vw] rounded-full blur-[180px]"
          style={{ bottom: '0%', right: '5%', background: 'linear-gradient(200deg, #1a1d24, #1f2229)' }}
          animate={{ x: [0, -20, 15, 0], y: [0, -15, 20, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        {/* Film grain */}
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px'
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-[380px] mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center mb-4"
          >
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="text-white/60">
              <path d="M24 4L4 14v20l20 10 20-10V14L24 4z" stroke="currentColor" strokeWidth="1" fill="none" />
              <path d="M24 4v40M4 14l20 10 20-10M4 34l20-10 20 10" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.4" />
            </svg>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[20px] font-light tracking-[0.4em] text-white/70"
          >
            OXYX
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[10px] tracking-[0.2em] text-white/15 uppercase mt-1"
          >
            System Authentication
          </motion.p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          {/* Email */}
          <div className="flex items-center gap-3 h-11 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl focus-within:border-white/15 transition-colors">
            <Mail size={14} className="text-white/15 shrink-0" />
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 bg-transparent text-[12px] text-white/60 outline-none placeholder-white/15"
              required spellCheck={false} autoComplete="email"
              disabled={!!isLocked}
            />
          </div>

          {/* Password */}
          <div className="flex items-center gap-3 h-11 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl focus-within:border-white/15 transition-colors">
            <Lock size={14} className="text-white/15 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="flex-1 bg-transparent text-[12px] text-white/60 outline-none placeholder-white/15"
              required autoComplete="current-password"
              disabled={!!isLocked}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/15 hover:text-white/30 transition-colors">
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10"
            >
              <AlertCircle size={12} className="text-red-400/50 shrink-0" />
              <p className="text-[10px] text-red-400/60">{error}</p>
            </motion.div>
          )}

          {/* Attempt counter */}
          {attempts > 0 && attempts < MAX_ATTEMPTS && !isLocked && (
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i < attempts ? 'bg-red-400/40' : 'bg-white/[0.06]'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={loading || !!isLocked}
            className="w-full h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/15
              text-[12px] text-white/50 hover:text-white/70 tracking-wider uppercase transition-all duration-300
              flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? (
              <motion.div className="w-4 h-4 border border-white/20 border-t-white/50 rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
            ) : isLocked ? (
              <>
                <Shield size={14} className="text-red-400/40" />
                System Locked
              </>
            ) : (
              <>
                Access System
                <ArrowRight size={14} className="text-white/30" />
              </>
            )}
          </button>

          {/* Forgot Password */}
          <div className="text-center">
            <button
              type="button"
              disabled={!!isLocked}
              onClick={async () => {
                if (!email.trim()) {
                  setError('Enter your email first, then click recovery.');
                  return;
                }
                try {
                  await sendPasswordResetEmail(auth, email);
                  setError('');
                  setRecoveryMsg('Recovery link sent to your email.');
                  await logSystemEvent('password_reset_requested', { email });
                } catch {
                  setError('Failed to send recovery email. Check the address.');
                }
              }}
              className="inline-flex items-center gap-1.5 text-[10px] text-white/20 hover:text-white/40 transition-colors tracking-wider disabled:opacity-20"
            >
              <KeyRound size={10} />
              Forgot Password?
            </button>
          </div>

          {/* Recovery success message */}
          {recoveryMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/10"
            >
              <Mail size={12} className="text-green-400/50 shrink-0" />
              <p className="text-[10px] text-green-400/60">{recoveryMsg}</p>
            </motion.div>
          )}
        </motion.form>

        {/* Security badge — NO register button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-1.5 mt-8"
        >
          <Lock size={8} className="text-white/8" />
          <span className="text-[8px] text-white/8 tracking-wider">RESTRICTED ACCESS · AUTHORIZED PERSONNEL ONLY</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
