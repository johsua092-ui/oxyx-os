"use client";

import React from 'react';
import { useOSStore } from '@/store/osStore';
import { Window } from './Window';
import { AnimatePresence } from 'framer-motion';

import { OxyxAIApp } from '@/modules/apps/oxyx-ai/components/OxyxAIApp';
import { TerminalApp } from '@/modules/apps/terminal/TerminalApp';
import { FileExplorerApp } from '@/modules/apps/explorer/FileExplorerApp';
import { MusicApp } from '@/modules/apps/music/MusicApp';

const SettingsApp = () => (
  <div className="h-full w-full bg-[#0a0a0c] p-6">
    <div className="mb-6 pb-3 border-b border-white/5">
      <h2 className="text-[14px] font-medium text-white/50 tracking-wide">Settings</h2>
    </div>
    <div className="space-y-2">
      {[
        { label: 'Appearance', desc: 'Wallpaper, theme, transparency' },
        { label: 'System', desc: 'Performance, startup, about' },
        { label: 'AI Engine', desc: 'Provider keys, model preferences' },
        { label: 'Network', desc: 'Proxy, DNS, connections' },
      ].map(({ label, desc }) => (
        <div key={label} className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl cursor-pointer transition-all duration-300 group">
          <div>
            <p className="text-[13px] text-white/50 group-hover:text-white/65 transition-colors">{label}</p>
            <p className="text-[11px] text-white/15 mt-0.5">{desc}</p>
          </div>
          <div className="text-white/10 group-hover:text-white/25 transition-colors text-[14px]">&rsaquo;</div>
        </div>
      ))}
    </div>
  </div>
);

export const WindowManager: React.FC = () => {
  const windows = useOSStore(state => state.windows);

  const renderAppContent = (appId: string) => {
    switch (appId) {
      case 'terminal': return <TerminalApp />;
      case 'explorer': return <FileExplorerApp />;
      case 'music': return <MusicApp />;
      case 'settings': return <SettingsApp />;
      case 'oxyx-ai': return <OxyxAIApp />;
      default: return <div className="p-4 text-white/30">Unknown application</div>;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      <AnimatePresence>
        {windows.map(windowState => (
          <div key={windowState.id} className="pointer-events-auto">
            <Window windowState={windowState}>
              {renderAppContent(windowState.appId)}
            </Window>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
