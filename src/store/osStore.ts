import { create } from 'zustand';
import { AppID, WindowState, AppConfig } from '@/types/os';

interface OSStore {
  isBooting: boolean;
  windows: WindowState[];
  activeWindowId: string | null;
  highestZIndex: number;
  
  // Actions
  completeBoot: () => void;
  openApp: (appId: AppID, config: AppConfig) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, width: number, height: number) => void;
}

export const useOSStore = create<OSStore>((set, get) => ({
  isBooting: true,
  windows: [],
  activeWindowId: null,
  highestZIndex: 10,

  completeBoot: () => set({ isBooting: false }),

  openApp: (appId, config) => {
    const { windows, highestZIndex } = get();
    const newZIndex = highestZIndex + 1;
    
    // Check if app is already open
    const existingWindow = windows.find(w => w.appId === appId);
    if (existingWindow) {
      get().focusWindow(existingWindow.id);
      if (existingWindow.isMinimized) {
        set((state) => ({
          windows: state.windows.map(w => w.id === existingWindow.id ? { ...w, isMinimized: false } : w)
        }));
      }
      return;
    }

    // Default centered position roughly based on standard 1080p
    const newWindow: WindowState = {
      id: `${appId}-${Date.now()}`,
      appId,
      title: config.title,
      x: typeof window !== 'undefined' ? (window.innerWidth / 2) - ((config.defaultWidth || 800) / 2) : 100,
      y: typeof window !== 'undefined' ? (window.innerHeight / 2) - ((config.defaultHeight || 600) / 2) : 100,
      width: config.defaultWidth || 800,
      height: config.defaultHeight || 600,
      isMinimized: false,
      isMaximized: false,
      zIndex: newZIndex,
    };

    set({
      windows: [...windows, newWindow],
      activeWindowId: newWindow.id,
      highestZIndex: newZIndex,
    });
  },

  closeWindow: (id) => {
    set((state) => {
      const remainingWindows = state.windows.filter(w => w.id !== id);
      const nextActiveWindow = remainingWindows.length > 0 
        ? remainingWindows.reduce((prev, current) => (prev.zIndex > current.zIndex) ? prev : current)
        : null;

      return {
        windows: remainingWindows,
        activeWindowId: state.activeWindowId === id ? (nextActiveWindow?.id || null) : state.activeWindowId
      };
    });
  },

  minimizeWindow: (id) => {
    set((state) => {
      const updatedWindows = state.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w);
      // Find the next highest z-index window that is not minimized
      const visibleWindows = updatedWindows.filter(w => !w.isMinimized);
      const nextActiveWindow = visibleWindows.length > 0 
        ? visibleWindows.reduce((prev, current) => (prev.zIndex > current.zIndex) ? prev : current)
        : null;

      return {
        windows: updatedWindows,
        activeWindowId: state.activeWindowId === id ? (nextActiveWindow?.id || null) : state.activeWindowId
      };
    });
  },

  maximizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)
    }));
    get().focusWindow(id);
  },

  focusWindow: (id) => {
    const { activeWindowId, highestZIndex } = get();
    if (activeWindowId === id) return; // already focused

    const newZIndex = highestZIndex + 1;
    set((state) => ({
      windows: state.windows.map(w => w.id === id ? { ...w, zIndex: newZIndex } : w),
      activeWindowId: id,
      highestZIndex: newZIndex,
    }));
  },

  updateWindowPosition: (id, x, y) => {
    set((state) => ({
      windows: state.windows.map(w => w.id === id ? { ...w, x, y } : w)
    }));
  },

  updateWindowSize: (id, width, height) => {
    set((state) => ({
      windows: state.windows.map(w => w.id === id ? { ...w, width, height } : w)
    }));
  },
}));
