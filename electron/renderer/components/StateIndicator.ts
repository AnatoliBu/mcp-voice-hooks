/**
 * State Indicator Component
 *
 * Управляет визуальным отображением текущего состояния overlay
 * (idle, listening, recording, processing, error)
 */

import { OverlayState, STATE_VISUAL_CONFIG, StateMetadata } from '../types';

export class StateIndicator {
  private containerElement: HTMLElement;
  private dotElement: HTMLElement;
  private textElement: HTMLElement;
  private waveformElement: HTMLElement | null = null;
  private currentState: OverlayState = OverlayState.IDLE;

  constructor(containerSelector: string) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      throw new Error(`Container element not found: ${containerSelector}`);
    }
    this.containerElement = container as HTMLElement;

    // Ищем элементы внутри контейнера
    const dot = this.containerElement.querySelector('.status-dot');
    const text = this.containerElement.querySelector('.status-indicator span');

    if (!dot || !text) {
      throw new Error('Required elements (.status-dot, span) not found in container');
    }

    this.dotElement = dot as HTMLElement;
    this.textElement = text as HTMLElement;

    // Инициализируем с idle состоянием
    this.setState(OverlayState.IDLE);
  }

  /**
   * Устанавливает новое состояние
   */
  setState(state: OverlayState, metadata?: StateMetadata): void {
    const previousState = this.currentState;
    this.currentState = state;

    const config = STATE_VISUAL_CONFIG[state];

    // Удаляем старые animation классы
    this.clearAnimationClasses();

    // Обновляем цвет индикатора
    this.dotElement.style.background = config.color;
    this.dotElement.style.boxShadow = `0 0 8px ${this.hexToRgba(config.color, 0.6)}`;

    // Синхронизируем цвет текста с цветом dot
    this.textElement.style.color = config.color;

    // Устанавливаем data-state attribute для CSS targeting
    this.containerElement.dataset.state = state;

    // Обновляем текст
    let displayText = config.text;
    if (state === OverlayState.ERROR && metadata?.errorMessage) {
      displayText = `Error: ${metadata.errorMessage}`;
    }

    this.updateText(displayText);

    // Добавляем новые animation классы
    const animationClasses = config.animationClass.split(' ');
    animationClasses.forEach(cls => {
      this.dotElement.classList.add(cls);
    });

    // Управляем waveform
    if (config.showWaveform) {
      this.showWaveform();
    } else {
      this.hideWaveform();
    }

    // Если это error state, автоматически вернуться в idle через 10 секунд
    if (state === OverlayState.ERROR) {
      setTimeout(() => {
        if (this.currentState === OverlayState.ERROR) {
          this.setState(OverlayState.IDLE);
        }
      }, 10000);
    }

    console.log(`State transition: ${previousState} -> ${state}`);
  }

  /**
   * Получает текущее состояние
   */
  getState(): OverlayState {
    return this.currentState;
  }

  /**
   * Обновляет текст с fade анимацией
   */
  private updateText(text: string): void {
    // Fade out
    this.textElement.style.opacity = '0';

    setTimeout(() => {
      this.textElement.textContent = text;
      // Fade in
      this.textElement.style.opacity = '1';
    }, 150);
  }

  /**
   * Удаляет все animation классы
   */
  private clearAnimationClasses(): void {
    const animationClasses = [
      'pulse-slow',
      'pulse-fast',
      'ripple',
      'wave',
      'spin',
      'shake'
    ];

    animationClasses.forEach(cls => {
      this.dotElement.classList.remove(cls);
    });
  }

  /**
   * Показывает waveform визуализацию
   */
  private showWaveform(): void {
    if (this.waveformElement) {
      this.waveformElement.style.display = 'flex';
      return;
    }

    // Создаём waveform элемент
    this.waveformElement = document.createElement('div');
    this.waveformElement.className = 'waveform';

    // Создаём 5 вертикальных баров
    for (let i = 0; i < 5; i++) {
      const bar = document.createElement('div');
      bar.className = 'waveform-bar';
      // Задержка анимации для каждого бара
      bar.style.animationDelay = `${i * 0.1}s`;
      this.waveformElement.appendChild(bar);
    }

    this.containerElement.appendChild(this.waveformElement);
  }

  /**
   * Скрывает waveform визуализацию
   */
  private hideWaveform(): void {
    if (this.waveformElement) {
      this.waveformElement.style.display = 'none';
    }
  }

  /**
   * Конвертирует hex цвет в rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    // Убираем # если есть
    hex = hex.replace('#', '');

    // Парсим RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Уничтожает компонент и очищает ресурсы
   */
  destroy(): void {
    if (this.waveformElement) {
      this.waveformElement.remove();
      this.waveformElement = null;
    }
  }
}
