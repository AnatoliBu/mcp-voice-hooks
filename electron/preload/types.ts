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

  // Settings window
  toggleSettings(): Promise<void>;
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

export interface AppSettings {
  // Speech Recognition
  language: string; // 'en-US', 'ru-RU', etc.

  // Send Mode
  sendMode: 'auto' | 'trigger-word';
  triggerWord: string; // default: 'send'

  // TTS Settings
  volume: number; // 0.0 - 1.0
  rate: number; // 0.5 - 2.0

  // UI Preferences (future)
  theme?: 'light' | 'dark';
}

export interface SettingsAPI {
  // Получить текущие настройки
  get(): Promise<AppSettings>;

  // Установить настройки (частично или полностью)
  set(settings: Partial<AppSettings>): Promise<AppSettings>;

  // Сбросить настройки к значениям по умолчанию
  reset(): Promise<AppSettings>;

  // Подписаться на изменения настроек
  onChange(callback: (settings: AppSettings) => void): () => void;
}

export interface ElectronAPI {
  platform: NodeJS.Platform;
  window: WindowAPI;
  voice: VoiceAPI;
  mcp: MCPAPI;
  settings: SettingsAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
