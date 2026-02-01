// IPC API types для type-safe communication между renderer и main

export interface WindowState {
  position: { x: number; y: number };
  visible: boolean;
  alwaysOnTop: boolean;
}

export interface VoiceState {
  state: 'idle' | 'listening' | 'recording' | 'processing' | 'error';
  timestamp: number;
  metadata?: {
    errorMessage?: string;
    recordingDuration?: number;
    volume?: number;
    [key: string]: any;
  };
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

export interface VoiceAPI {
  // Получить текущее состояние голосового ввода
  getState(): Promise<VoiceState>;

  // Подписаться на изменения состояния
  onStateChanged(callback: (state: VoiceState) => void): () => void;
}

export interface MCPAPI {
  // Отправить utterance в MCP server
  sendUtterance(text: string): Promise<void>;

  // Установить состояние voice input (активен/неактивен)
  setVoiceInputActive(active: boolean): Promise<void>;

  // Получить состояние voice input из MCP server
  getVoiceInputState(): Promise<boolean>;
}

export interface ElectronAPI {
  platform: NodeJS.Platform;
  window: WindowAPI;
  voice: VoiceAPI;
  mcp: MCPAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
