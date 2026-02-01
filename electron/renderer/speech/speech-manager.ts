// Main speech manager that coordinates recognition, modes, and MCP client

import { SpeechRecognitionManager } from './speech-recognition';
import { AutoSendMode } from './modes/auto-send';
import { TriggerWordMode } from './modes/trigger-word';
import { SpeechUI, SendMode } from './speech-ui';
import { OverlayState } from '../types';

// Fake MCP client для renderer process (будет использовать IPC для общения с main process)
interface MCPClientInterface {
  sendUtterance(text: string): Promise<void>;
  setVoiceInputActive(active: boolean): Promise<void>;
}

export class SpeechManager {
  private recognitionManager: SpeechRecognitionManager;
  private autoSendMode: AutoSendMode;
  private triggerWordMode: TriggerWordMode;
  private currentMode: SendMode = SendMode.AUTO;
  private ui: SpeechUI;
  private mcpClient: MCPClientInterface;

  constructor(ui: SpeechUI, mcpClient: MCPClientInterface) {
    this.ui = ui;
    this.mcpClient = mcpClient;

    this.recognitionManager = new SpeechRecognitionManager({
      lang: 'ru-RU',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1
    });

    this.autoSendMode = new AutoSendMode(
      (text) => this.sendToMCP(text),
      (text) => this.ui.updateInterimText(text)
    );

    this.triggerWordMode = new TriggerWordMode(
      (text) => this.sendToMCP(text),
      (queue) => this.ui.updateQueue(queue)
    );

    this.setupRecognitionHandlers();
    this.setupUIHandlers();
  }

  async startListening(): Promise<void> {
    try {
      await this.recognitionManager.start();
      await this.mcpClient.setVoiceInputActive(true);
      this.ui.setState(OverlayState.LISTENING);
    } catch (error) {
      console.error('Failed to start listening:', error);
      this.ui.setState(OverlayState.ERROR, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  stopListening(): void {
    this.recognitionManager.stop();
    this.mcpClient.setVoiceInputActive(false);
    this.ui.setState(OverlayState.IDLE);

    this.currentMode === SendMode.AUTO ? this.autoSendMode.clear() : this.triggerWordMode.clear();
  }

  switchMode(mode: SendMode): void {
    // Очищаем предыдущий режим
    this.currentMode === SendMode.AUTO ? this.autoSendMode.clear() : this.triggerWordMode.clear();

    this.currentMode = mode;
    this.ui.updateMode(mode);
  }

  setTriggerWord(word: string): void {
    this.triggerWordMode.setTriggerWord(word);
  }

  private setupRecognitionHandlers(): void {
    this.recognitionManager.onStart = () => {
      this.ui.setState(OverlayState.LISTENING);
    };

    this.recognitionManager.onInterimResult = (result) => {
      this.ui.setState(OverlayState.LISTENING);

      if (this.currentMode === SendMode.AUTO) {
        this.autoSendMode.handleInterimResult(result.transcript);
      } else {
        this.triggerWordMode.handleInterimResult(result.transcript);
      }
    };

    this.recognitionManager.onFinalResult = (result) => {
      this.ui.setState(OverlayState.RECORDING);

      if (this.currentMode === SendMode.AUTO) {
        this.autoSendMode.handleFinalResult(result.transcript, result.confidence);
      } else {
        this.triggerWordMode.handleFinalResult(result.transcript, result.confidence);
      }
    };

    this.recognitionManager.onError = (error) => {
      this.ui.setState(OverlayState.ERROR, {
        errorMessage: error.message
      });
    };

    this.recognitionManager.onEnd = () => {
      this.ui.setState(OverlayState.IDLE);
    };
  }

  private setupUIHandlers(): void {
    // Toggle listening button
    this.ui.onToggleListening(() => {
      if (this.recognitionManager.getIsListening()) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });

    // Mode change
    this.ui.onModeChange((mode) => {
      this.switchMode(mode);
    });

    // Trigger word change
    this.ui.onTriggerWordChange((word) => {
      this.setTriggerWord(word);
    });
  }

  private async sendToMCP(text: string): Promise<void> {
    this.ui.setState(OverlayState.PROCESSING);

    try {
      await this.mcpClient.sendUtterance(text);
      this.ui.setState(OverlayState.IDLE);
    } catch (error) {
      this.ui.setState(OverlayState.ERROR, {
        errorMessage: 'Failed to send to MCP server'
      });
    }
  }
}
