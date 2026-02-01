import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, WindowAPI, VoiceAPI, SettingsAPI, InteractiveRegion, WindowState, VoiceState, AppSettings } from './types';

// Window API для управления окном из renderer
const windowAPI: WindowAPI = {
  setPosition: (x: number, y: number) =>
    ipcRenderer.invoke('window:set-position', x, y),

  setVisible: (visible: boolean) =>
    ipcRenderer.invoke('window:set-visible', visible),

  setAlwaysOnTop: (alwaysOnTop: boolean) =>
    ipcRenderer.invoke('window:set-always-on-top', alwaysOnTop),

  getState: (): Promise<WindowState> =>
    ipcRenderer.invoke('window:get-state'),

  startDrag: () =>
    ipcRenderer.invoke('window:start-drag'),

  updateDragPosition: (screenX: number, screenY: number, offsetX: number, offsetY: number) =>
    ipcRenderer.invoke('window:update-drag-position', screenX, screenY, offsetX, offsetY),

  endDrag: () =>
    ipcRenderer.invoke('window:end-drag'),

  updateInteractiveRegions: (regions: InteractiveRegion[]) =>
    ipcRenderer.invoke('window:update-interactive-regions', regions),

  toggleSettings: () =>
    ipcRenderer.invoke('window:toggle-settings')
};

// Voice API для управления голосовым вводом
const voiceAPI: VoiceAPI = {
  getState: (): Promise<VoiceState> =>
    ipcRenderer.invoke('voice:get-state'),

  onStateChanged: (callback: (state: VoiceState) => void) => {
    const listener = (_event: any, state: VoiceState) => callback(state);
    ipcRenderer.on('voice:state-changed', listener);

    // Возвращаем функцию для отписки
    return () => {
      ipcRenderer.removeListener('voice:state-changed', listener);
    };
  }
};

// Settings API для управления настройками
const settingsAPI: SettingsAPI = {
  get: (): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:get'),

  set: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', settings),

  reset: (): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:reset'),

  onChange: (callback: (settings: AppSettings) => void) => {
    const listener = (_event: any, settings: AppSettings) => callback(settings);
    ipcRenderer.on('settings:changed', listener);

    // Возвращаем функцию для отписки
    return () => {
      ipcRenderer.removeListener('settings:changed', listener);
    };
  }
};

// MCP API (заглушка - будет добавлена при интеграции MCP)
const mcpAPI = {
  sendUtterance: async (text: string) => {
    await ipcRenderer.invoke('mcp:send-utterance', text);
  },
  setVoiceInputActive: async (active: boolean) => {
    await ipcRenderer.invoke('mcp:set-voice-input-active', active);
  },
  getVoiceInputState: async (): Promise<boolean> => {
    return ipcRenderer.invoke('mcp:get-voice-input-state');
  }
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api: ElectronAPI = {
  platform: process.platform,
  window: windowAPI,
  voice: voiceAPI,
  mcp: mcpAPI,
  settings: settingsAPI
};

contextBridge.exposeInMainWorld('electronAPI', api);
