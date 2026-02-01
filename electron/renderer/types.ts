/**
 * UI State Management Types для Overlay
 */

/**
 * Возможные состояния overlay UI
 */
export enum OverlayState {
  /** Готов к работе, ожидание действий */
  IDLE = 'idle',

  /** Активное прослушивание голоса (после нажатия hotkey) */
  LISTENING = 'listening',

  /** Идет запись голоса (voice input detected) */
  RECORDING = 'recording',

  /** Обработка голосового ввода */
  PROCESSING = 'processing',

  /** Ошибка (нет микрофона, проблема с API и т.д.) */
  ERROR = 'error'
}

/**
 * Метаданные состояния
 */
export interface StateMetadata {
  /** Сообщение об ошибке (для ERROR state) */
  errorMessage?: string;

  /** Длительность записи в миллисекундах (для RECORDING state) */
  recordingDuration?: number;

  /** Уровень громкости 0-1 (для RECORDING state) */
  volume?: number;

  /** Произвольные дополнительные данные */
  [key: string]: any;
}

/**
 * Обновление состояния от renderer к main
 */
export interface VoiceStateUpdate {
  state: OverlayState;
  metadata?: StateMetadata;
  timestamp?: number;
}

/**
 * Изменение состояния от main к renderer
 */
export interface VoiceStateChanged {
  state: OverlayState;
  timestamp: number;
  metadata?: StateMetadata;
}

/**
 * Переход между состояниями
 */
export interface StateTransition {
  from: OverlayState;
  to: OverlayState;
  trigger: StateTrigger;
  timestamp: number;
}

/**
 * Триггеры для переходов между состояниями
 */
export enum StateTrigger {
  /** Нажата горячая клавиша */
  HOTKEY = 'hotkey',

  /** Обнаружен голос */
  VOICE_DETECTED = 'voice-detected',

  /** Обработка завершена */
  PROCESSING_COMPLETE = 'processing-complete',

  /** Произошла ошибка */
  ERROR = 'error',

  /** Ручной сброс/остановка */
  RESET = 'reset',

  /** Таймаут */
  TIMEOUT = 'timeout'
}

/**
 * Конфигурация визуального состояния
 */
export interface StateVisualConfig {
  /** Цвет индикатора */
  color: string;

  /** Текст состояния */
  text: string;

  /** CSS класс для анимации */
  animationClass: string;

  /** Показать waveform визуализацию */
  showWaveform?: boolean;
}

/**
 * Маппинг состояний на визуальную конфигурацию
 */
export const STATE_VISUAL_CONFIG: Record<OverlayState, StateVisualConfig> = {
  [OverlayState.IDLE]: {
    color: '#4ade80', // green
    text: 'Ready',
    animationClass: 'pulse-slow'
  },
  [OverlayState.LISTENING]: {
    color: '#3b82f6', // blue
    text: 'Listening...',
    animationClass: 'pulse-fast ripple'
  },
  [OverlayState.RECORDING]: {
    color: '#ef4444', // red
    text: 'Recording...',
    animationClass: 'wave',
    showWaveform: true
  },
  [OverlayState.PROCESSING]: {
    color: '#f59e0b', // orange/yellow
    text: 'Processing...',
    animationClass: 'spin'
  },
  [OverlayState.ERROR]: {
    color: '#dc2626', // dark red
    text: 'Error',
    animationClass: 'shake'
  }
};

/**
 * Hotkey hint для tooltip
 */
export interface HotkeyHint {
  /** Описание действия */
  action: string;

  /** Массив клавиш (e.g., ['Command', 'Shift', 'Space']) */
  keys: string[];

  /** Зависит от платформы */
  platformSpecific: boolean;
}

/**
 * Tooltip данные
 */
export interface TooltipData {
  /** Текст tooltip */
  text: string;

  /** Hotkey hint (опционально) */
  hotkey?: HotkeyHint;

  /** Позиция относительно элемента */
  position?: 'top' | 'bottom' | 'left' | 'right';
}
