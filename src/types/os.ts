export type AppID = 'terminal' | 'explorer' | 'music' | 'settings' | 'oxyx-ai' | 'monitor';

export interface AppConfig {
  id: AppID;
  title: string;
  icon: any;
  defaultWidth?: number;
  defaultHeight?: number;
  resizable?: boolean;
}

export interface WindowState {
  id: string;
  appId: AppID;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}
