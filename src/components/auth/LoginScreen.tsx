"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Auth / Login Screen
// Premium login/register UI with boot-style animations.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Lock, Mail, User, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      const messages: Record<string, string> = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'Account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Email already registered',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid email or password',
      };
      setError(messages[code] || 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black selection:bg-white/20">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,20,35,0.8),rgba(0,0,0,1))]" />
        <motion.div
          className="absolute w-[50vw] h-[50vw] rounded-full blur-[150px] opacity-[0.06]"
          style={{ top: '20%', left: '30%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          animate={{ x: [0, 40, -20, 0], y: [0, 30, -15, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-[35vw] h-[35vw] rounded-full blur-[120px] opacity-[0.04]"
          style={{ bottom: '10%', right: '20%', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)' }}
          animate={{ x: [0, -30, 20, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        {/* Film grain */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay"
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
            {isLogin ? 'System Authentication' : 'Create Account'}
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
          {/* Display Name (Register only) */}
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center gap-3 h-11 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl focus-within:border-white/15 transition-colors">
                <User size={14} className="text-white/15 shrink-0" />
                <input
                  type="text" value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="flex-1 bg-transparent text-[12px] text-white/60 outline-none placeholder-white/15"
                  spellCheck={false}
                />
              </div>
            </motion.div>
          )}

          {/* Email */}
          <div className="flex items-center gap-3 h-11 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl focus-within:border-white/15 transition-colors">
            <Mail size={14} className="text-white/15 shrink-0" />
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 bg-transparent text-[12px] text-white/60 outline-none placeholder-white/15"
              required spellCheck={false} autoComplete="email"
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
              required autoComplete={isLogin ? 'current-password' : 'new-password'}
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

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            className="w-full h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/15
              text-[12px] text-white/50 hover:text-white/70 tracking-wider uppercase transition-all duration-300
              flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? (
              <motion.div className="w-4 h-4 border border-white/20 border-t-white/50 rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
            ) : (
              <>
                {isLogin ? 'Access System' : 'Create Account'}
                <ArrowRight size={14} className="text-white/30" />
              </>
            )}
          </button>
        </motion.form>

        {/* Toggle Login/Register */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-6"
        >
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-[10px] text-white/15 hover:text-white/30 transition-colors tracking-wider"
          >
            {isLogin ? 'No account? Create one' : 'Already have an account? Sign in'}
          </button>
        </motion.div>

        {/* Security badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center justify-center gap-1.5 mt-6"
        >
          <Lock size={8} className="text-white/8" />
          <span className="text-[8px] text-white/8 tracking-wider">ENCRYPTED · FIREBASE AUTH</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
