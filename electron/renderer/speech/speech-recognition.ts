// Web Speech API wrapper with auto-restart and error handling

export type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

export interface SpeechRecognitionConfig {
  lang: string; // 'ru-RU', 'en-US'
  continuous: boolean; // Непрерывное распознавание
  interimResults: boolean; // Промежуточные результаты
  maxAlternatives: number; // Количество альтернативных результатов
}

export interface FinalResult {
  transcript: string;
  confidence: number;
}

export interface InterimResult {
  transcript: string;
}

export interface RecognitionError {
  error: SpeechRecognitionErrorCode;
  message: string;
}

export class SpeechRecognitionManager {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private restartAttempts = 0;
  private maxRestartAttempts = 5;

  // Event callbacks
  onStart?: () => void;
  onFinalResult?: (result: FinalResult) => void;
  onInterimResult?: (result: InterimResult) => void;
  onError?: (error: RecognitionError) => void;
  onEnd?: () => void;

  constructor(private config: SpeechRecognitionConfig) {}

  async start(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Speech API not supported');
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    await this.requestMicrophonePermission();
    this.initializeRecognition();
    this.recognition!.start();
    this.isListening = true;
  }

  stop(): void {
    if (!this.isListening) return;

    this.recognition?.stop();
    this.isListening = false;
    this.restartAttempts = 0;
  }

  isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  private initializeRecognition(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.lang;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleResult(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.handleError(event);
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.handleEnd();
    };
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    const results = event.results;
    const lastResult = results[results.length - 1];

    if (lastResult.isFinal) {
      const transcript = lastResult[0].transcript;
      const confidence = lastResult[0].confidence;

      this.onFinalResult?.({ transcript, confidence });
    } else {
      const transcript = lastResult[0].transcript;
      this.onInterimResult?.({ transcript });
    }
  }

  private handleError(event: SpeechRecognitionErrorEvent): void {
    console.error('Speech recognition error:', event.error);

    this.onError?.({
      error: event.error as SpeechRecognitionErrorCode,
      message: this.getErrorMessage(event.error as SpeechRecognitionErrorCode)
    });

    // Попытка auto-restart при определённых ошибках
    if (this.shouldAutoRestart(event.error as SpeechRecognitionErrorCode)) {
      this.attemptRestart();
    } else {
      this.isListening = false;
    }
  }

  private handleEnd(): void {
    this.isListening = false;

    // Auto-restart если listening был активен
    if (this.restartAttempts < this.maxRestartAttempts) {
      this.attemptRestart();
    } else {
      this.onEnd?.();
    }
  }

  private shouldAutoRestart(error: SpeechRecognitionErrorCode): boolean {
    // Список ошибок, при которых пытаемся перезапустить
    const restartableErrors: SpeechRecognitionErrorCode[] = [
      'network',
      'no-speech',
      'aborted'
    ];

    return restartableErrors.includes(error);
  }

  private async attemptRestart(): Promise<void> {
    this.restartAttempts++;

    const delay = Math.min(1000 * this.restartAttempts, 5000); // Max 5 секунд
    console.log(`Attempting restart (${this.restartAttempts}/${this.maxRestartAttempts}) in ${delay}ms`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (this.restartAttempts < this.maxRestartAttempts) {
      try {
        this.start();
      } catch (error) {
        console.error('Restart failed:', error);
        this.onEnd?.();
      }
    } else {
      console.error('Max restart attempts reached');
      this.onEnd?.();
    }
  }

  private getErrorMessage(error: SpeechRecognitionErrorCode): string {
    const messages: Record<SpeechRecognitionErrorCode, string> = {
      'no-speech': 'No speech detected. Please speak into the microphone.',
      'aborted': 'Speech recognition aborted.',
      'audio-capture': 'Microphone not available or blocked.',
      'network': 'Network error occurred.',
      'not-allowed': 'Microphone permission denied.',
      'service-not-allowed': 'Speech service not allowed.',
      'bad-grammar': 'Grammar error.',
      'language-not-supported': 'Language not supported.'
    };

    return messages[error] || `Unknown error: ${error}`;
  }

  private async requestMicrophonePermission(): Promise<void> {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      throw new Error('Microphone permission denied');
    }
  }
}
