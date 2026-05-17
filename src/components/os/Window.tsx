"use client";

import React, { useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Minus, Square, X } from 'lucide-react';
import { useOSStore } from '@/store/osStore';
import { WindowState } from '@/types/os';
import { cn } from '@/lib/utils';

interface WindowProps {
  windowState: WindowState;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({ windowState, children }) => {
  const { id, title, x, y, width, height, isMinimized, isMaximized, zIndex } = windowState;
  
  const closeWindow = useOSStore((state) => state.closeWindow);
  const minimizeWindow = useOSStore((state) => state.minimizeWindow);
  const maximizeWindow = useOSStore((state) => state.maximizeWindow);
  const focusWindow = useOSStore((state) => state.focusWindow);
  const updateWindowPosition = useOSStore((state) => state.updateWindowPosition);
  const activeWindowId = useOSStore((state) => state.activeWindowId);

  const isActive = activeWindowId === id;
  const dragControls = useDragControls();
  const constraintsRef = useRef(null); // Actually, we'll let it drag anywhere, or constrain to parent

  if (isMinimized) return null;

  return (
    <motion.div
      id={`window-${id}`}
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-xl",
        "glass-panel transition-shadow duration-200",
        isActive && "glass-panel-active"
      )}
      style={{ zIndex }}
      initial={{ opacity: 0, scale: 0.95, y: y + 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        x: isMaximized ? 0 : x,
        y: isMaximized ? 0 : y,
        width: isMaximized ? '100vw' : width,
        height: isMaximized ? 'calc(100vh - 64px)' : height, // 64px for taskbar height
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }}
      drag={!isMaximized}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={(e, info) => {
        if (!isMaximized) {
          updateWindowPosition(id, x + info.offset.x, y + info.offset.y);
        }
      }}
      onPointerDown={() => focusWindow(id)}
    >
      {/* Title Bar */}
      <div 
        className="h-10 flex items-center justify-between px-4 select-none cursor-default border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]"
        onPointerDown={(e) => {
          focusWindow(id);
          if (!isMaximized) {
            dragControls.start(e);
          }
        }}
        onDoubleClick={() => maximizeWindow(id)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium tracking-wide text-os-text/90">{title}</span>
        </div>
        
        {/* Window Controls */}
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); minimizeWindow(id); }}
            className="text-os-text-muted hover:text-white transition-colors"
          >
            <Minus size={14} strokeWidth={2.5} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); maximizeWindow(id); }}
            className="text-os-text-muted hover:text-white transition-colors"
          >
            <Square size={12} strokeWidth={2.5} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); closeWindow(id); }}
            className="text-os-text-muted hover:text-red-400 transition-colors"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-[rgba(0,0,0,0.2)]">
        {children}
      </div>
    </motion.div>
  );
};
