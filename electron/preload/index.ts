import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, WindowAPI, VoiceAPI, InteractiveRegion, WindowState, VoiceState } from './types';

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
    ipcRenderer.invoke('window:update-interactive-regions', regions)
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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api: ElectronAPI = {
  platform: process.platform,
  window: windowAPI,
  voice: voiceAPI
};

contextBridge.exposeInMainWorld('electronAPI', api);
