// Auto-send mode: отправка после паузы в речи

export class AutoSendMode {
  private pendingTranscript = '';
  private silenceTimeout: number | null = null;
  private readonly silenceDelay = 1500; // 1.5 секунды паузы

  constructor(
    private onSend: (text: string) => void,
    private onInterimUpdate: (text: string) => void
  ) {}

  handleInterimResult(transcript: string): void {
    this.pendingTranscript = transcript;
    this.onInterimUpdate(transcript);
    this.resetSilenceTimer();
  }

  handleFinalResult(transcript: string, _confidence: number): void {
    this.pendingTranscript = transcript;
    this.onInterimUpdate(transcript);

    // Сбрасываем таймер и запускаем новый
    this.resetSilenceTimer();
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimeout !== null) {
      clearTimeout(this.silenceTimeout);
    }

    this.silenceTimeout = window.setTimeout(() => {
      if (this.pendingTranscript.trim()) {
        this.send();
      }
    }, this.silenceDelay);
  }

  private send(): void {
    const text = this.pendingTranscript.trim();
    if (text) {
      this.onSend(text);
      this.pendingTranscript = '';
      this.onInterimUpdate('');
    }

    if (this.silenceTimeout !== null) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  clear(): void {
    this.pendingTranscript = '';
    this.onInterimUpdate('');

    if (this.silenceTimeout !== null) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  getPendingText(): string {
    return this.pendingTranscript;
  }
}
