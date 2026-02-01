/**
 * Tooltip Component
 *
 * Показывает tooltips с hotkey hints при hover над элементами
 */

import { TooltipData, HotkeyHint } from '../types';

export class TooltipManager {
  private tooltipElement: HTMLElement | null = null;
  private showTimeout: number | null = null;
  private hideTimeout: number | null = null;
  private readonly SHOW_DELAY = 500; // ms
  private readonly HIDE_DELAY = 150; // ms

  constructor() {
    this.createTooltipElement();
  }

  /**
   * Создаёт DOM элемент для tooltip
   */
  private createTooltipElement(): void {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'tooltip';
    document.body.appendChild(this.tooltipElement);
  }

  /**
   * Регистрирует tooltip для элемента
   */
  attach(element: HTMLElement, data: TooltipData): void {
    const showHandler = (e: MouseEvent) => {
      this.clearTimeouts();

      this.showTimeout = window.setTimeout(() => {
        this.show(e.clientX, e.clientY, data);
      }, this.SHOW_DELAY);
    };

    const hideHandler = () => {
      this.clearTimeouts();

      this.hideTimeout = window.setTimeout(() => {
        this.hide();
      }, this.HIDE_DELAY);
    };

    const moveHandler = (e: MouseEvent) => {
      if (this.tooltipElement && this.tooltipElement.classList.contains('visible')) {
        this.updatePosition(e.clientX, e.clientY, data.position);
      }
    };

    element.addEventListener('mouseenter', showHandler);
    element.addEventListener('mouseleave', hideHandler);
    element.addEventListener('mousemove', moveHandler);

    // Сохраняем handlers для возможности удаления
    (element as any)._tooltipHandlers = {
      show: showHandler,
      hide: hideHandler,
      move: moveHandler
    };
  }

  /**
   * Удаляет tooltip с элемента
   */
  detach(element: HTMLElement): void {
    const handlers = (element as any)._tooltipHandlers;
    if (handlers) {
      element.removeEventListener('mouseenter', handlers.show);
      element.removeEventListener('mouseleave', handlers.hide);
      element.removeEventListener('mousemove', handlers.move);
      delete (element as any)._tooltipHandlers;
    }
  }

  /**
   * Показывает tooltip
   */
  private show(x: number, y: number, data: TooltipData): void {
    if (!this.tooltipElement) return;

    // Очищаем содержимое
    this.tooltipElement.innerHTML = '';

    // Создаём текст
    const textEl = document.createElement('div');
    textEl.className = 'tooltip-text';
    textEl.textContent = data.text;
    this.tooltipElement.appendChild(textEl);

    // Добавляем hotkey hint если есть
    if (data.hotkey) {
      const hotkeyEl = this.createHotkeyElement(data.hotkey);
      this.tooltipElement.appendChild(hotkeyEl);
    }

    // Устанавливаем позицию
    const position = data.position || 'top';
    this.tooltipElement.className = `tooltip position-${position}`;

    this.updatePosition(x, y, position);

    // Показываем
    requestAnimationFrame(() => {
      if (this.tooltipElement) {
        this.tooltipElement.classList.add('visible');
      }
    });
  }

  /**
   * Обновляет позицию tooltip
   */
  private updatePosition(x: number, y: number, position: string = 'top'): void {
    if (!this.tooltipElement) return;

    const offset = 12; // отступ от курсора
    const rect = this.tooltipElement.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = x;
    let top = y;

    switch (position) {
      case 'top':
        left = x - rect.width / 2;
        top = y - rect.height - offset;
        break;
      case 'bottom':
        left = x - rect.width / 2;
        top = y + offset;
        break;
      case 'left':
        left = x - rect.width - offset;
        top = y - rect.height / 2;
        break;
      case 'right':
        left = x + offset;
        top = y - rect.height / 2;
        break;
    }

    // Проверяем границы экрана и корректируем
    if (left < 8) left = 8;
    if (left + rect.width > windowWidth - 8) left = windowWidth - rect.width - 8;
    if (top < 8) top = 8;
    if (top + rect.height > windowHeight - 8) top = windowHeight - rect.height - 8;

    this.tooltipElement.style.left = `${left}px`;
    this.tooltipElement.style.top = `${top}px`;
  }

  /**
   * Скрывает tooltip
   */
  private hide(): void {
    if (!this.tooltipElement) return;
    this.tooltipElement.classList.remove('visible');
  }

  /**
   * Создаёт элемент с hotkey hint
   */
  private createHotkeyElement(hotkey: HotkeyHint): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tooltip-hotkey';

    // Форматируем клавиши для текущей платформы
    const formattedKeys = this.formatHotkey(hotkey);

    formattedKeys.forEach((key, index) => {
      const keyEl = document.createElement('span');
      keyEl.className = 'tooltip-key';

      // Определяем модификаторы (Command, Ctrl, Shift, Alt)
      if (this.isModifierKey(key)) {
        keyEl.classList.add('modifier');
      }

      keyEl.textContent = key;
      container.appendChild(keyEl);

      // Добавляем + между клавишами
      if (index < formattedKeys.length - 1) {
        const plus = document.createElement('span');
        plus.textContent = '+';
        plus.style.opacity = '0.5';
        container.appendChild(plus);
      }
    });

    return container;
  }

  /**
   * Форматирует hotkey для текущей платформы
   */
  private formatHotkey(hotkey: HotkeyHint): string[] {
    if (!hotkey.platformSpecific) {
      return hotkey.keys;
    }

    const platform = window.electronAPI?.platform || 'unknown';

    return hotkey.keys.map(key => {
      // Конвертируем клавиши в символы для macOS
      if (platform === 'darwin') {
        switch (key.toLowerCase()) {
          case 'command':
          case 'cmd':
            return '⌘';
          case 'shift':
            return '⇧';
          case 'alt':
          case 'option':
            return '⌥';
          case 'control':
          case 'ctrl':
            return '⌃';
          default:
            return key;
        }
      }

      // Для Windows/Linux оставляем текст
      switch (key.toLowerCase()) {
        case 'command':
        case 'cmd':
          return 'Ctrl';
        case 'option':
          return 'Alt';
        default:
          return key;
      }
    });
  }

  /**
   * Проверяет, является ли клавиша модификатором
   */
  private isModifierKey(key: string): boolean {
    const modifiers = ['⌘', '⇧', '⌥', '⌃', 'ctrl', 'shift', 'alt', 'command', 'control', 'option'];
    return modifiers.includes(key.toLowerCase());
  }

  /**
   * Очищает все таймауты
   */
  private clearTimeouts(): void {
    if (this.showTimeout !== null) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  /**
   * Уничтожает tooltip manager
   */
  destroy(): void {
    this.clearTimeouts();

    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
  }
}
