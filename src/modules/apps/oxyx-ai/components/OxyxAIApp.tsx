"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Oxyx AI / Main Application
// The top-level Oxyx AI application shell with mode switching
// and sidebar navigation.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOxyxAIStore, OxyxMode } from '../store/oxyxAIStore';
import { useOxyxAI } from '../hooks/useOxyxAI';
import { getConversations, deleteConversation } from '@/lib/firestore';
import { auth } from '@/lib/firebase';
import { ChatPanel } from './ChatPanel';
import { MessageSquare, ScanEye, Trash2, Plus, Calendar, ChevronRight } from 'lucide-react';

const modes: { id: OxyxMode; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'vision', label: 'Vision', icon: ScanEye },
];

export const OxyxAIApp: React.FC = () => {
  const { mode, setMode, messages } = useOxyxAIStore();
  const { loadConversation, startNewChat, conversationId } = useOxyxAI();
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; messageCount: number; updatedAt: any }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoadingHistory(true);
    try {
      const history = await getConversations(user.uid);
      setConversations(history);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Fetch history on mount and whenever the message count changes (a message was sent or received)
  useEffect(() => {
    fetchHistory();
  }, [messages.length, fetchHistory]);

  const handleSelectConversation = async (id: string) => {
    await loadConversation(id);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteConversation(user.uid, id);
      if (conversationId === id) {
        startNewChat();
      }
      fetchHistory();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  return (
    <div className="h-full w-full flex bg-[#07070a]">
      {/* Primary Sidebar (Icons) */}
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

        <div className="flex-1" />

        {/* New Chat Button */}
        <button
          onClick={startNewChat}
          className="p-3 rounded-xl text-white/20 hover:text-white/60 hover:bg-white/[0.03] transition-all duration-300"
          title="New conversation"
        >
          <Plus size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Secondary Sidebar (Conversation History) */}
      <div className="w-[200px] border-r border-white/5 bg-[#0b0b0f] flex flex-col shrink-0">
        <div className="p-3 border-b border-white/5 flex items-center justify-between shrink-0">
          <span className="text-[10px] uppercase font-mono tracking-wider text-white/30">Chat History</span>
          <button
            onClick={startNewChat}
            className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white/70 transition-all"
            title="New Chat"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 select-none">
          {loadingHistory && conversations.length === 0 ? (
            <div className="text-[10px] text-center text-white/10 font-mono py-4">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-[10px] text-center text-white/10 font-mono py-4">No active sessions</div>
          ) : (
            conversations.map((conv) => {
              const isActive = conversationId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`
                    group w-full text-left px-2.5 py-2 rounded-lg cursor-pointer
                    flex items-center justify-between transition-all duration-300
                    ${isActive 
                      ? 'bg-white/[0.04] text-white/80 border border-white/5 shadow-sm'
                      : 'hover:bg-white/[0.02] text-white/40 hover:text-white/60 border border-transparent'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="text-[11px] truncate font-medium">
                      {conv.title || 'Untitled Chat'}
                    </div>
                    <div className="text-[9px] text-white/15 mt-0.5 font-mono flex items-center gap-1">
                      <Calendar size={8} />
                      <span>{conv.messageCount} msg</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 hover:text-red-400 text-white/20 transition-all duration-200"
                    title="Delete Chat"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })
          )}
        </div>
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
