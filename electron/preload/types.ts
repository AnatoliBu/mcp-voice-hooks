// IPC API types для type-safe communication между renderer и main
export interface ElectronAPI {
  // Placeholder для будущих IPC методов
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
