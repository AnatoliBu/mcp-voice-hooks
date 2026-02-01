/**
 * MCP Server Integration
 *
 * Подключается к MCP voice server и синхронизирует voice states
 * между server и overlay UI
 */

import { BrowserWindow } from 'electron';
import type { VoiceState } from '../preload/types';

export class MCPIntegration {
  private window: BrowserWindow;
  private serverUrl: string;
  private currentState: VoiceState;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 500; // 500ms polling

  constructor(window: BrowserWindow, serverUrl: string = 'http://localhost:5111') {
    this.window = window;
    this.serverUrl = serverUrl;
    this.currentState = {
      state: 'idle',
      timestamp: Date.now()
    };
  }

  /**
   * Начинает polling MCP server для получения voice state
   */
  start(): void {
    console.log('Starting MCP integration, polling:', this.serverUrl);

    // Немедленно получаем текущее состояние
    this.fetchVoiceState();

    // Затем начинаем polling
    this.pollInterval = setInterval(() => {
      this.fetchVoiceState();
    }, this.POLL_INTERVAL_MS);
  }

  /**
   * Останавливает polling
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('MCP integration stopped');
  }

  /**
   * Получает текущее состояние
   */
  getCurrentState(): VoiceState {
    return this.currentState;
  }

  /**
   * Получает voice state из MCP server
   */
  private async fetchVoiceState(): Promise<void> {
    try {
      // TODO: Заменить на реальный API endpoint когда будет реализован
      // Сейчас используем mock данные для разработки
      const mockState = await this.getMockVoiceState();

      // Проверяем, изменилось ли состояние
      if (mockState.state !== this.currentState.state) {
        this.currentState = mockState;
        this.notifyRenderer(mockState);
      }
    } catch (error) {
      console.error('Failed to fetch voice state:', error);

      // При ошибке переходим в error state
      const errorState: VoiceState = {
        state: 'error',
        timestamp: Date.now(),
        metadata: {
          errorMessage: 'Connection to MCP server failed'
        }
      };

      if (this.currentState.state !== 'error') {
        this.currentState = errorState;
        this.notifyRenderer(errorState);
      }
    }
  }

  /**
   * Mock данные для разработки
   * TODO: Заменить на реальный HTTP request к MCP server
   */
  private async getMockVoiceState(): Promise<VoiceState> {
    // Для разработки просто возвращаем idle
    // В реальной реализации здесь будет fetch() к API
    return {
      state: 'idle',
      timestamp: Date.now()
    };

    /*
    // Пример реальной реализации:
    const response = await fetch(`${this.serverUrl}/api/voice-state`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      state: data.state,
      timestamp: data.timestamp,
      metadata: data.metadata
    };
    */
  }

  /**
   * Отправляет обновление состояния в renderer process
   */
  private notifyRenderer(state: VoiceState): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('voice:state-changed', state);
      console.log('Voice state changed:', state.state);
    }
  }

  /**
   * Проверяет доступность MCP server
   */
  async checkServerAvailability(): Promise<boolean> {
    try {
      // TODO: Реализовать реальную проверку
      // const response = await fetch(`${this.serverUrl}/health`);
      // return response.ok;
      return true;
    } catch {
      return false;
    }
  }
}
