// Trigger word mode: накопление utterances до произнесения trigger word

export class TriggerWordMode {
  private pendingTranscripts: string[] = [];
  private triggerWord: string = 'send';

  constructor(
    private onSend: (text: string) => void,
    private onQueueUpdate: (queue: string[]) => void
  ) {}

  setTriggerWord(word: string): void {
    this.triggerWord = word.toLowerCase();
  }

  getTriggerWord(): string {
    return this.triggerWord;
  }

  handleInterimResult(transcript: string): void {
    // Показываем промежуточный результат в UI
    this.onQueueUpdate([...this.pendingTranscripts, transcript]);
  }

  handleFinalResult(transcript: string, _confidence: number): void {
    const text = transcript.trim();
    if (!text) return;

    // Проверяем наличие trigger word
    const lowerText = text.toLowerCase();
    const hasTriggerWord = lowerText.includes(this.triggerWord);

    if (hasTriggerWord) {
      // Удаляем trigger word из текста
      const cleanedText = this.removeTriggerWord(text);

      if (cleanedText) {
        this.pendingTranscripts.push(cleanedText);
      }

      // Отправляем всё накопленное
      this.sendAll();
    } else {
      // Добавляем в очередь
      this.pendingTranscripts.push(text);
      this.onQueueUpdate([...this.pendingTranscripts]);
    }
  }

  private removeTriggerWord(text: string): string {
    const regex = new RegExp(`\\b${this.triggerWord}\\b`, 'gi');
    return text.replace(regex, '').trim();
  }

  sendAll(): void {
    if (this.pendingTranscripts.length === 0) return;

    const combinedText = this.pendingTranscripts.join(' ').trim();

    if (combinedText) {
      this.onSend(combinedText);
    }

    this.clear();
  }

  sendNow(): void {
    this.sendAll();
  }

  clear(): void {
    this.pendingTranscripts = [];
    this.onQueueUpdate([]);
  }

  getQueue(): string[] {
    return [...this.pendingTranscripts];
  }
}
