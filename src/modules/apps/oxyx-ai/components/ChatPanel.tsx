"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Oxyx AI / Chat Panel
// The core chat interface with message stream and input area.
// ─────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOxyxAI } from '../hooks/useOxyxAI';
import { useOxyxAIStore, ChatMessage } from '../store/oxyxAIStore';
import { ResponseRenderer } from './ResponseRenderer';
import { ImageUploader } from './ImageUploader';
import { SendHorizontal, Loader2, Mic, MicOff, Volume2, VolumeX, Brain, Sparkles, X } from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const { messages, isProcessing, sendMessage, cancelMessage } = useOxyxAI();
  const { 
    currentInput, 
    setInput,
    selectedProvider,
    setSelectedProvider,
    conversationMemory,
    setConversationMemory,
    isListening,
    setListening,
    isSpeaking,
    setSpeaking,
    ttsEnabled,
    setTtsEnabled
  } = useOxyxAIStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const voiceTriggeredRef = useRef(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Speech Recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'id-ID';

        rec.onresult = (event: any) => {
          const text = event.results[0]?.[0]?.transcript;
          if (text && text.trim()) {
            voiceTriggeredRef.current = true;
            setInput(text);
            // Small delay to let recognition cleanup before sending
            setTimeout(() => {
              sendMessage(text);
            }, 150);
          }
        };

        rec.onend = () => {
          setListening(false);
        };

        rec.onerror = (event: any) => {
          // 'no-speech' is normal — user pressed mic but didn't speak
          if (event.error !== 'no-speech') {
            console.warn('[Voice] Recognition error:', event.error);
          }
          setListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, [setInput, sendMessage, setListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setListening(false);
    } else {
      // Cancel any ongoing TTS before listening
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      }
      setListening(true);
      try {
        recognitionRef.current.start();
      } catch {
        // Already running — abort and restart
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            recognitionRef.current.start();
          }, 100);
        } catch { setListening(false); }
      }
    }
  };

  const toggleSpeaking = () => {
    const nextState = !ttsEnabled;
    setTtsEnabled(nextState);

    if (!nextState) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
    } else {
      // Find the last assistant message and read it immediately
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && !m.isLoading);
      if (lastAssistantMsg) {
        setSpeaking(true);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const cleanText = lastAssistantMsg.content.replace(/[*#`_\-]/g, '').trim();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          const voices = window.speechSynthesis.getVoices();
          let voice = voices.find(v => v.lang.startsWith('id') || v.lang.startsWith('en'));
          if (voice) utterance.voice = voice;
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  };

  const handleSubmit = () => {
    if (isProcessing || (!currentInput.trim() && !useOxyxAIStore.getState().pendingImage)) return;
    sendMessage(currentInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-1 scroll-smooth"
      >
        {messages.length === 0 && (
          <EmptyState />
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Processing indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 py-3 px-1"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-white/20 rounded-full"
                  animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-[11px] text-white/20 tracking-wider uppercase">Processing</span>
            <button
              onClick={cancelMessage}
              className="text-[9px] text-red-400/40 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 px-2 py-0.5 border border-red-500/10 hover:border-red-500/20 rounded font-mono uppercase transition-all duration-300"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/5 bg-white/[0.02] px-4 py-3 space-y-2">
        <ImageUploader />
        
        {/* Model, Memory, Voice Controls */}
        <div className="flex items-center justify-between text-[11px] px-1">
          {/* Provider Selection */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 rounded-lg p-0.5">
            {(['auto', 'gemini', 'groq', 'deepseek'] as const).map((prov) => (
              <button
                key={prov}
                onClick={() => setSelectedProvider(prov)}
                className={`
                  px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider transition-all duration-300
                  ${selectedProvider === prov
                    ? 'bg-white/10 text-white border border-white/10 shadow-sm shadow-white/5'
                    : 'text-white/30 hover:text-white/60 border border-transparent'
                  }
                `}
              >
                {prov}
              </button>
            ))}
          </div>

          {/* Quick toggles (Memory & Speak) */}
          <div className="flex items-center gap-2">
            {/* Memory toggle */}
            <button
              onClick={() => setConversationMemory(!conversationMemory)}
              className={`
                p-1.5 rounded-lg border transition-all duration-300 flex items-center gap-1.5
                ${conversationMemory
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400/80 hover:text-emerald-400'
                  : 'bg-white/[0.02] border-white/5 text-white/20 hover:text-white/40'
                }
              `}
              title={conversationMemory ? "Conversation memory active" : "Memory inactive"}
            >
              <Brain size={12} />
              <span className="text-[9px] uppercase tracking-wider font-mono">Memory</span>
            </button>

            {/* Read out loud toggle */}
            <button
              onClick={toggleSpeaking}
              className={`
                p-1.5 rounded-lg border transition-all duration-300 flex items-center gap-1.5
                ${ttsEnabled
                  ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:text-purple-300'
                  : 'bg-white/[0.02] border-white/5 text-white/20 hover:text-white/40'
                }
                ${isSpeaking ? 'animate-pulse' : ''}
              `}
              title={ttsEnabled ? "Text-to-speech active" : "Text-to-speech off"}
            >
              {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              <span className="text-[9px] uppercase tracking-wider font-mono">TTS</span>
            </button>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1 relative flex items-center bg-white/[0.03] border border-white/8 rounded-xl px-2">
            <button
              onClick={toggleListening}
              className={`
                p-2 rounded-lg transition-all duration-300 mr-1
                ${isListening
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse'
                  : 'text-white/20 hover:text-white/50'
                }
              `}
              title={isListening ? "Listening... (click to stop)" : "Voice input (Speaks back)"}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <textarea
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask Oxyx AI anything..."}
              rows={1}
              className="
                flex-1 bg-transparent
                py-3 text-[13px] text-white/80 placeholder-white/15
                resize-none outline-none
                min-h-[44px] max-h-[120px]
              "
              style={{ overflow: 'hidden' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <button
            onClick={isProcessing ? cancelMessage : handleSubmit}
            disabled={!isProcessing && !currentInput.trim() && !useOxyxAIStore.getState().pendingImage}
            className={`
              p-3 rounded-xl border transition-all duration-300
              ${isProcessing 
                ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400' 
                : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/8 hover:border-white/15 text-white/40 hover:text-white/70'
              }
            `}
            title={isProcessing ? "Cancel response" : "Send message"}
          >
            {isProcessing ? (
              <X size={16} />
            ) : (
              <SendHorizontal size={16} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Message Bubble ──────────────────────────────────────────

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`py-3 ${isUser ? 'flex justify-end' : ''}`}
    >
      {isUser ? (
        <div className="max-w-[80%]">
          {message.imagePreview && (
            <div className="mb-2 rounded-lg overflow-hidden border border-white/8 inline-block">
              <img src={message.imagePreview} alt="Attached" className="max-h-40 object-contain" />
            </div>
          )}
          <div className="bg-white/[0.06] border border-white/8 rounded-xl rounded-br-sm px-4 py-2.5">
            <p className="text-[13px] text-white/70">{message.content}</p>
          </div>
          <div className="text-[10px] text-white/15 mt-1 text-right tabular-nums">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ) : (
        <div className="max-w-[90%]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-sm bg-white/8 border border-white/10 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
            </div>
            <span className="text-[10px] text-white/25 tracking-[0.2em] uppercase font-medium">Oxyx</span>
          </div>
          <div className="pl-6">
            <ResponseRenderer content={message.content} />
            {message.provider && (
              <div className="mt-3 flex items-center gap-3 text-[10px] text-white/15 tabular-nums">
                <span>{message.provider} / {message.model}</span>
                {message.latencyMs && <span>{message.latencyMs}ms</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── Empty State ─────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="h-full flex flex-col items-center justify-center text-center py-20">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Minimal geometric logo */}
      <div className="relative w-16 h-16 mx-auto">
        <div className="absolute inset-0 border border-white/8 rounded-2xl rotate-45" />
        <div className="absolute inset-2 border border-white/5 rounded-xl rotate-45" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-white/20 rounded-full" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[15px] font-medium text-white/40 tracking-wide">Oxyx AI</h3>
        <p className="text-[12px] text-white/15 max-w-[260px] leading-relaxed">
          Intelligence system ready. Upload visual clues, run reconnaissance queries, or begin analysis.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-[320px]">
        {['Recon target', 'Analyze screenshot', 'Generate dorks', 'Craft payload'].map((hint) => (
          <span
            key={hint}
            className="px-3 py-1.5 text-[11px] text-white/20 bg-white/[0.03] border border-white/5 rounded-lg"
          >
            {hint}
          </span>
        ))}
      </div>
    </motion.div>
  </div>
);
