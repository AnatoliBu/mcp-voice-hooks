// Speech UI helper class

import { StateIndicator } from '../components/StateIndicator';
import { OverlayState } from '../types';

export enum SendMode {
  AUTO = 'auto',
  TRIGGER_WORD = 'trigger-word'
}

export class SpeechUI {
  private stateIndicator: StateIndicator;
  private interimTextEl: HTMLElement | null;
  private queuedMessagesEl: HTMLElement | null;
  private toggleListeningBtn: HTMLButtonElement | null;
  private modeRadios: NodeListOf<HTMLInputElement> | null;
  private triggerWordSettings: HTMLElement | null;
  private triggerWordInput: HTMLInputElement | null;
  private contextHintEl: HTMLElement | null;

  constructor(stateIndicator: StateIndicator) {
    this.stateIndicator = stateIndicator;
    this.interimTextEl = document.getElementById('interimText');
    this.queuedMessagesEl = document.getElementById('queuedMessages');
    this.toggleListeningBtn = document.getElementById('toggleListeningBtn') as HTMLButtonElement;
    this.modeRadios = document.querySelectorAll('input[name="sendMode"]');
    this.triggerWordSettings = document.getElementById('triggerWordSettings');
    this.triggerWordInput = document.getElementById('triggerWordInput') as HTMLInputElement;
    this.contextHintEl = document.getElementById('contextHint');

    // Initialize context hint with default mode
    this.updateContextHint(SendMode.AUTO);
  }

  setState(state: OverlayState, metadata?: unknown): void {
    this.stateIndicator.setState(state, metadata);

    // Обновляем кнопку
    if (this.toggleListeningBtn) {
      if (state === OverlayState.LISTENING || state === OverlayState.RECORDING) {
        const span = this.toggleListeningBtn.querySelector('span');
        if (span) span.textContent = 'Stop Listening';
        this.toggleListeningBtn.classList.add('active');
      } else {
        const span = this.toggleListeningBtn.querySelector('span');
        if (span) span.textContent = 'Start Listening';
        this.toggleListeningBtn.classList.remove('active');
      }
    }
  }

  updateInterimText(text: string): void {
    if (!this.interimTextEl) return;

    this.interimTextEl.textContent = text;
    this.interimTextEl.classList.toggle('hidden', !text);
  }

  updateQueue(queue: string[]): void {
    if (!this.queuedMessagesEl) return;

    if (queue.length === 0) {
      this.queuedMessagesEl.classList.add('hidden');
      this.queuedMessagesEl.innerHTML = '';
      return;
    }

    this.queuedMessagesEl.classList.remove('hidden');
    this.queuedMessagesEl.innerHTML = queue
      .map((msg, i) => `<div class="queued-message">${i + 1}. ${msg}</div>`)
      .join('');
  }

  updateMode(mode: SendMode): void {
    // Показываем/скрываем trigger word settings (используем is-hidden для сохранения layout)
    if (this.triggerWordSettings) {
      if (mode === SendMode.TRIGGER_WORD) {
        this.triggerWordSettings.classList.remove('is-hidden');
      } else {
        this.triggerWordSettings.classList.add('is-hidden');
      }
    }

    // Обновляем context hint
    this.updateContextHint(mode);
  }

  private updateContextHint(mode: SendMode): void {
    if (!this.contextHintEl) return;

    const hintTextEl = this.contextHintEl.querySelector('.hint-text');
    if (!hintTextEl) return;

    if (mode === SendMode.AUTO) {
      hintTextEl.textContent = 'Auto-send on pause';
    } else {
      const triggerWord = this.getTriggerWord();
      hintTextEl.textContent = `Say "${triggerWord}" to send`;
    }
  }

  getTriggerWord(): string {
    return this.triggerWordInput?.value.trim() || 'send';
  }

  onModeChange(callback: (mode: SendMode) => void): void {
    if (!this.modeRadios) return;

    this.modeRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          callback(radio.value as SendMode);
        }
      });
    });
  }

  onTriggerWordChange(callback: (word: string) => void): void {
    if (!this.triggerWordInput) return;

    this.triggerWordInput.addEventListener('change', () => {
      const word = this.getTriggerWord();
      callback(word);
      // Обновляем context hint при изменении trigger word
      this.updateContextHint(SendMode.TRIGGER_WORD);
    });
  }

  onToggleListening(callback: () => void): void {
    if (!this.toggleListeningBtn) return;

    this.toggleListeningBtn.addEventListener('click', callback);
  }
}
