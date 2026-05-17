"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Oxyx AI / Main Application
// The top-level Oxyx AI application shell with mode switching
// and sidebar navigation.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { motion } from 'framer-motion';
import { useOxyxAIStore, OxyxMode } from '../store/oxyxAIStore';
import { ChatPanel } from './ChatPanel';
import { MessageSquare, ScanEye, Trash2 } from 'lucide-react';

const modes: { id: OxyxMode; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'vision', label: 'Vision', icon: ScanEye },
];

export const OxyxAIApp: React.FC = () => {
  const { mode, setMode, clearChat, messages } = useOxyxAIStore();

  return (
    <div className="h-full w-full flex bg-[#07070a]">
      {/* Sidebar */}
      <div className="w-[52px] border-r border-white/5 bg-black/30 flex flex-col items-center py-4 gap-1 shrink-0">
        {/* Mode switches */}
        <div className="space-y-1">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`
                relative p-3 rounded-xl transition-all duration-300 group
                ${mode === id
                  ? 'bg-white/[0.06] text-white/60'
                  : 'text-white/20 hover:text-white/40 hover:bg-white/[0.03]'
                }
              `}
              title={label}
            >
              <Icon size={18} strokeWidth={1.5} />
              {mode === id && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-white/30 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear chat */}
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-3 rounded-xl text-white/15 hover:text-red-400/60 hover:bg-red-400/5 transition-all duration-300"
            title="Clear conversation"
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-9 border-b border-white/5 bg-white/[0.01] flex items-center px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            <span className="text-[11px] text-white/25 tracking-[0.15em] uppercase font-medium">
              {mode === 'chat' ? 'Intelligence' : 'Visual Analysis'}
            </span>
          </div>
          <div className="flex-1" />
          <span className="text-[10px] text-white/10 font-mono tabular-nums">
            oxyx://ai/{mode}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
};
