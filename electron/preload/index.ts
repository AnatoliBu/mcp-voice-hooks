import { contextBridge } from 'electron';
import type { ElectronAPI } from './types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api: ElectronAPI = {
  platform: process.platform
};

contextBridge.exposeInMainWorld('electronAPI', api);
