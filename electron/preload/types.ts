// IPC API types для type-safe communication между renderer и main

export interface WindowState {
  position: { x: number; y: number };
  visible: boolean;
  alwaysOnTop: boolean;
}

export interface InteractiveRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowAPI {
  setPosition(x: number, y: number): Promise<{ x: number; y: number }>;
  setVisible(visible: boolean): Promise<boolean>;
  setAlwaysOnTop(alwaysOnTop: boolean): Promise<boolean>;
  getState(): Promise<WindowState>;

  // Drag & drop
  startDrag(): Promise<void>;
  updateDragPosition(screenX: number, screenY: number, offsetX: number, offsetY: number): Promise<void>;
  endDrag(): Promise<void>;

  // Интерактивные зоны
  updateInteractiveRegions(regions: InteractiveRegion[]): Promise<void>;
}

export interface ElectronAPI {
  platform: NodeJS.Platform;
  window: WindowAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
