"use client";

import { Desktop } from '@/components/os/Desktop';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';

function AppContent() {
  const { user, loading } = useAuth();

  return (
    <main className="w-screen h-screen overflow-hidden bg-black">
      {loading ? (
        <div key="loading" className="w-full h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              className="w-5 h-5 border border-white/15 border-t-white/40 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-[10px] text-white/15 tracking-[0.3em] uppercase">Loading</p>
          </motion.div>
        </div>
      ) : !user ? (
        <div key="login" className="w-full h-full">
          <LoginScreen />
        </div>
      ) : (
        <div key="desktop" className="w-full h-full">
          <Desktop />
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
