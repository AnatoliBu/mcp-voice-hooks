/**
 * Application settings stored persistently via electron-store
 */
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

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en-US',
  sendMode: 'auto',
  triggerWord: 'send',
  volume: 1.0,
  rate: 1.0
};

/**
 * JSON Schema for electron-store validation
 */
export const SETTINGS_SCHEMA = {
  language: {
    type: 'string',
    default: 'en-US'
  },
  sendMode: {
    type: 'string',
    enum: ['auto', 'trigger-word'],
    default: 'auto'
  },
  triggerWord: {
    type: 'string',
    default: 'send'
  },
  volume: {
    type: 'number',
    minimum: 0,
    maximum: 1,
    default: 1.0
  },
  rate: {
    type: 'number',
    minimum: 0.5,
    maximum: 2.0,
    default: 1.0
  }
} as const;
