"use client";

import React from 'react';
import { useOSStore } from '@/store/osStore';
import { Terminal, Folder, Music, Settings, Crosshair } from 'lucide-react';
import { AppID, AppConfig } from '@/types/os';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const APPS: Record<AppID, AppConfig> = {
  'oxyx-ai': { id: 'oxyx-ai', title: 'Oxyx AI', icon: Crosshair, defaultWidth: 900, defaultHeight: 600 },
  'terminal': { id: 'terminal', title: 'Terminal', icon: Terminal, defaultWidth: 700, defaultHeight: 450 },
  'explorer': { id: 'explorer', title: 'Files', icon: Folder, defaultWidth: 800, defaultHeight: 500 },
  'music': { id: 'music', title: 'Music', icon: Music, defaultWidth: 850, defaultHeight: 550 },
  'settings': { id: 'settings', title: 'Settings', icon: Settings, defaultWidth: 600, defaultHeight: 400 },
};

export const Taskbar: React.FC = () => {
  const openApp = useOSStore(state => state.openApp);
  const windows = useOSStore(state => state.windows);
  const activeWindowId = useOSStore(state => state.activeWindowId);

  const isAppRunning = (appId: AppID) => windows.some(w => w.appId === appId);
  const isAppActive = (appId: AppID) => {
    const activeWindow = windows.find(w => w.id === activeWindowId);
    return activeWindow?.appId === appId;
  };

  const handleAppClick = (appId: AppID) => {
    openApp(appId, APPS[appId]);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.5 }}
        className="glass-panel rounded-2xl px-3 py-2 flex items-center gap-1"
      >
        {Object.values(APPS).map((app) => {
          const Icon = app.icon;
          const running = isAppRunning(app.id);
          const active = isAppActive(app.id);

          return (
            <button
              key={app.id}
              onClick={() => handleAppClick(app.id)}
              className={cn(
                "relative p-3 rounded-xl transition-all duration-300 group hover:bg-[rgba(255,255,255,0.06)]",
                active && "bg-[rgba(255,255,255,0.08)]"
              )}
            >
              <Icon 
                size={22} 
                strokeWidth={1.5}
                className={cn(
                  "transition-all duration-300",
                  running ? "text-white/70" : "text-white/25",
                  active && "text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                )} 
              />
              
              {running && (
                <div 
                  className={cn(
                    "absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300",
                    active ? "w-4 bg-white/50" : "w-1.5 bg-white/20"
                  )}
                />
              )}

              <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[rgba(8,8,10,0.95)] border border-white/8 rounded-lg text-[11px] font-medium text-white/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap backdrop-blur-xl">
                {app.title}
              </div>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};
