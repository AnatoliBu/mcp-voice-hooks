/**
 * MCP Server Integration
 *
 * Подключается к MCP voice server через SSE и синхронизирует voice states
 * между server и overlay UI
 */

import { BrowserWindow, ipcMain } from 'electron';
import EventSource from 'eventsource';
import type { VoiceState } from '../preload/types';

// SSE event types from MCP server
interface SSEConnectedEvent {
  type: 'connected';
}

interface SSESpeakEvent {
  type: 'speak';
  text: string;
}

interface SSEWaitStatusEvent {
  type: 'waitStatus';
  isWaiting: boolean;
}

type SSEEvent = SSEConnectedEvent | SSESpeakEvent | SSEWaitStatusEvent;

// Voice input state from API
interface VoiceInputStateResponse {
  voiceInputActive: boolean;
  voiceResponsesEnabled: boolean;
}

export class MCPIntegration {
  private window: BrowserWindow;
  private serverUrl: string;
  private currentState: VoiceState;
  private eventSource: EventSource | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly RECONNECT_DELAY_MS = 3000;
  private isConnected = false;

  constructor(window: BrowserWindow, serverUrl: string = 'http://localhost:5111') {
    this.window = window;
    this.serverUrl = serverUrl;
    this.currentState = {
      state: 'idle',
      timestamp: Date.now()
    };
  }

  /**
   * Начинает SSE подключение к MCP server
   */
  async start(): Promise<void> {
    console.log('Starting MCP integration, connecting to:', this.serverUrl);

    // Получаем начальное состояние voice input
    await this.fetchInitialState();

    // Подключаемся к SSE
    this.connectSSE();
  }

  /**
   * Останавливает SSE подключение
   */
  stop(): void {
    this.disconnectSSE();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
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
   * Проверяет, подключен ли к серверу
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Получает начальное состояние voice input из сервера
   */
  private async fetchInitialState(): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}/api/voice-input-state`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as VoiceInputStateResponse;

      // Обновляем состояние на основе данных сервера
      const newState: VoiceState = {
        state: data.voiceInputActive ? 'listening' : 'idle',
        timestamp: Date.now(),
        metadata: {
          voiceResponsesEnabled: data.voiceResponsesEnabled
        }
      };

      if (newState.state !== this.currentState.state) {
        this.currentState = newState;
        this.notifyRenderer(newState);
      }

      console.log('Initial voice state fetched:', data);
    } catch (error) {
      console.error('Failed to fetch initial voice state:', error);
      // Не критично - продолжаем с SSE
    }
  }

  /**
   * Подключается к SSE endpoint
   */
  private connectSSE(): void {
    if (this.eventSource) {
      this.disconnectSSE();
    }

    const sseUrl = `${this.serverUrl}/api/tts-events`;
    console.log('Connecting to SSE:', sseUrl);

    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
      this.isConnected = true;

      // Сбрасываем error state при успешном подключении
      if (this.currentState.state === 'error') {
        const newState: VoiceState = {
          state: 'idle',
          timestamp: Date.now()
        };
        this.currentState = newState;
        this.notifyRenderer(newState);
      }
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;
        this.handleSSEEvent(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error, event.data);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.isConnected = false;

      // Устанавливаем error state
      const errorState: VoiceState = {
        state: 'error',
        timestamp: Date.now(),
        metadata: {
          errorMessage: 'Connection to MCP server lost'
        }
      };

      if (this.currentState.state !== 'error') {
        this.currentState = errorState;
        this.notifyRenderer(errorState);
      }

      // Планируем переподключение
      this.scheduleReconnect();
    };
  }

  /**
   * Отключается от SSE
   */
  private disconnectSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
  }

  /**
   * Планирует переподключение к SSE
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    console.log(`Scheduling SSE reconnect in ${this.RECONNECT_DELAY_MS}ms...`);

    this.reconnectTimeout = setTimeout(async () => {
      console.log('Attempting SSE reconnect...');
      this.disconnectSSE();

      // Пробуем получить состояние перед переподключением
      await this.fetchInitialState();
      this.connectSSE();
    }, this.RECONNECT_DELAY_MS);
  }

  /**
   * Обрабатывает SSE события
   */
  private handleSSEEvent(event: SSEEvent): void {
    console.log('SSE event received:', event.type);

    switch (event.type) {
      case 'connected':
        console.log('SSE: Connected to MCP server');
        break;

      case 'speak':
        // TTS событие - отправляем текст в renderer для воспроизведения
        this.notifyRendererTTS(event.text);
        break;

      case 'waitStatus':
        // Обновляем состояние на основе waitStatus
        const newState: VoiceState = {
          state: event.isWaiting ? 'processing' : this.currentState.state === 'processing' ? 'idle' : this.currentState.state,
          timestamp: Date.now(),
          metadata: {
            ...this.currentState.metadata,
            isWaiting: event.isWaiting
          }
        };

        if (newState.state !== this.currentState.state ||
            newState.metadata?.isWaiting !== this.currentState.metadata?.isWaiting) {
          this.currentState = newState;
          this.notifyRenderer(newState);
        }
        break;
    }
  }

  /**
   * Отправляет обновление состояния в renderer process и main process (для tray)
   */
  private notifyRenderer(state: VoiceState): void {
    if (this.window && !this.window.isDestroyed()) {
      // Отправляем в renderer process (для UI)
      this.window.webContents.send('voice:state-changed', state);

      // Отправляем в main process (для tray icon)
      ipcMain.emit('voice:state-changed-internal', null, state);

      console.log('Voice state changed:', state.state);
    }
  }

  /**
   * Отправляет TTS текст в renderer для воспроизведения
   */
  private notifyRendererTTS(text: string): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('tts:speak', text);
      console.log('TTS event sent to renderer:', text.substring(0, 50) + '...');
    }
  }

  /**
   * Проверяет доступность MCP server
   */
  async checkServerAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/voice-input-state`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
