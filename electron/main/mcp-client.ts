// MCP Server HTTP client для отправки utterances

export interface VoiceState {
  state: 'idle' | 'listening' | 'recording' | 'processing' | 'error';
  metadata?: {
    errorMessage?: string;
    recordingDuration?: number;
    volume?: number;
  };
}

export class MCPClient {
  private port: number;
  private baseUrl: string;

  constructor(port: number = 5111) {
    this.port = port;
    this.baseUrl = `http://localhost:${this.port}`;
  }

  async sendUtterance(text: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/potential-utterances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Failed to send utterance: ${response.statusText}`);
    }
  }

  async getVoiceState(): Promise<VoiceState> {
    const response = await fetch(`${this.baseUrl}/api/voice-state`);

    if (!response.ok) {
      throw new Error(`Failed to get voice state: ${response.statusText}`);
    }

    return response.json();
  }

  async setVoiceInputActive(active: boolean): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/voice-input-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ active })
    });

    if (!response.ok) {
      throw new Error(`Failed to set voice input state: ${response.statusText}`);
    }
  }

  isServerAvailable(): boolean {
    // Проверка доступности сервера (базовая)
    // В реальном приложении здесь может быть ping endpoint
    return true;
  }
}
