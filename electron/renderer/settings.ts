/**
 * Settings UI Controller
 * Manages the settings panel and syncs with electron-store
 */

import type { AppSettings } from './types';

interface SettingsElements {
  // Language
  languageSelect: HTMLSelectElement;

  // Send Mode
  sendModeAuto: HTMLInputElement;
  sendModeTrigger: HTMLInputElement;
  triggerWordInput: HTMLInputElement;
  triggerWordSettings: HTMLElement;

  // TTS
  volumeSlider: HTMLInputElement;
  volumeValue: HTMLElement;
  rateSlider: HTMLInputElement;
  rateValue: HTMLElement;

  // Actions
  resetBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;

  // Drag Handle
  dragHandle: HTMLElement;
}

class SettingsUI {
  private elements!: SettingsElements;
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor() {
    this.initializeElements();
    this.attachEventListeners();
    this.loadSettings();
    this.subscribeToChanges();
  }

  /**
   * Инициализация DOM элементов
   */
  private initializeElements(): void {
    this.elements = {
      // Language
      languageSelect: document.getElementById('languageSelect') as HTMLSelectElement,

      // Send Mode
      sendModeAuto: document.getElementById('sendModeAuto') as HTMLInputElement,
      sendModeTrigger: document.getElementById('sendModeTrigger') as HTMLInputElement,
      triggerWordInput: document.getElementById('triggerWordInput') as HTMLInputElement,
      triggerWordSettings: document.getElementById('triggerWordSettings') as HTMLElement,

      // TTS
      volumeSlider: document.getElementById('volumeSlider') as HTMLInputElement,
      volumeValue: document.getElementById('volumeValue') as HTMLElement,
      rateSlider: document.getElementById('rateSlider') as HTMLInputElement,
      rateValue: document.getElementById('rateValue') as HTMLElement,

      // Actions
      resetBtn: document.getElementById('resetBtn') as HTMLButtonElement,
      closeBtn: document.getElementById('closeBtn') as HTMLButtonElement,

      // Drag Handle
      dragHandle: document.getElementById('dragHandle') as HTMLElement
    };
  }

  /**
   * Подписка на события
   */
  private attachEventListeners(): void {
    // Language change
    this.elements.languageSelect.addEventListener('change', () => {
      this.saveSettings({ language: this.elements.languageSelect.value });
    });

    // Send Mode change
    this.elements.sendModeAuto.addEventListener('change', () => {
      if (this.elements.sendModeAuto.checked) {
        this.saveSettings({ sendMode: 'auto' });
        this.updateTriggerWordVisibility();
      }
    });

    this.elements.sendModeTrigger.addEventListener('change', () => {
      if (this.elements.sendModeTrigger.checked) {
        this.saveSettings({ sendMode: 'trigger-word' });
        this.updateTriggerWordVisibility();
      }
    });

    // Trigger word change
    this.elements.triggerWordInput.addEventListener('input', () => {
      this.saveSettings({ triggerWord: this.elements.triggerWordInput.value });
    });

    // Volume slider
    this.elements.volumeSlider.addEventListener('input', () => {
      const value = parseFloat(this.elements.volumeSlider.value) / 100;
      this.elements.volumeValue.textContent = `${this.elements.volumeSlider.value}%`;
      this.saveSettings({ volume: value });
    });

    // Rate slider
    this.elements.rateSlider.addEventListener('input', () => {
      const value = parseFloat(this.elements.rateSlider.value) / 100;
      this.elements.rateValue.textContent = `${value.toFixed(1)}x`;
      this.saveSettings({ rate: value });
    });

    // Reset button
    this.elements.resetBtn.addEventListener('click', async () => {
      await window.electronAPI.settings.reset();
      // Settings will update via onChange subscription
    });

    // Close button
    this.elements.closeBtn.addEventListener('click', async () => {
      await window.electronAPI.window.toggleSettings();
    });

    // Drag & drop
    this.setupDragAndDrop();
  }

  /**
   * Настройка drag & drop для перемещения окна
   */
  private setupDragAndDrop(): void {
    this.elements.dragHandle.addEventListener('mousedown', async (e: MouseEvent) => {
      if (e.button !== 0) return; // Только левая кнопка мыши

      this.isDragging = true;
      this.dragOffsetX = e.clientX;
      this.dragOffsetY = e.clientY;

      await window.electronAPI.window.startDrag();
      e.preventDefault();
    });

    document.addEventListener('mousemove', async (e: MouseEvent) => {
      if (!this.isDragging) return;

      await window.electronAPI.window.updateDragPosition(
        e.screenX,
        e.screenY,
        this.dragOffsetX,
        this.dragOffsetY
      );
    });

    document.addEventListener('mouseup', async () => {
      if (!this.isDragging) return;

      this.isDragging = false;
      await window.electronAPI.window.endDrag();
    });
  }

  /**
   * Загрузка текущих настроек из store
   */
  private async loadSettings(): Promise<void> {
    const settings = await window.electronAPI.settings.get();
    this.applySettings(settings);
  }

  /**
   * Применение настроек к UI
   */
  private applySettings(settings: AppSettings): void {
    // Language
    this.elements.languageSelect.value = settings.language;

    // Send Mode
    if (settings.sendMode === 'auto') {
      this.elements.sendModeAuto.checked = true;
    } else {
      this.elements.sendModeTrigger.checked = true;
    }
    this.updateTriggerWordVisibility();

    // Trigger Word
    this.elements.triggerWordInput.value = settings.triggerWord;

    // Volume
    const volumePercent = Math.round(settings.volume * 100);
    this.elements.volumeSlider.value = volumePercent.toString();
    this.elements.volumeValue.textContent = `${volumePercent}%`;

    // Rate
    const ratePercent = Math.round(settings.rate * 100);
    this.elements.rateSlider.value = ratePercent.toString();
    this.elements.rateValue.textContent = `${settings.rate.toFixed(1)}x`;
  }

  /**
   * Сохранение настроек в store
   */
  private async saveSettings(partial: Partial<AppSettings>): Promise<void> {
    await window.electronAPI.settings.set(partial);
    // Settings will update via onChange subscription
  }

  /**
   * Подписка на изменения настроек
   */
  private subscribeToChanges(): void {
    window.electronAPI.settings.onChange((settings) => {
      console.log('Settings changed:', settings);
      this.applySettings(settings);
    });
  }

  /**
   * Показать/скрыть настройки trigger word в зависимости от send mode
   */
  private updateTriggerWordVisibility(): void {
    if (this.elements.sendModeTrigger.checked) {
      this.elements.triggerWordSettings.style.display = 'block';
    } else {
      this.elements.triggerWordSettings.style.display = 'none';
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Settings UI initializing...');
  new SettingsUI();
  console.log('Settings UI ready');
});
