/**
 * Переиспользуемый модуль для window drag логики.
 * Использует startDrag/endDrag API из main process для smooth 60fps dragging.
 */

export interface WindowDragOptions {
  dragHandleId: string;
}

export class WindowDrag {
  private dragHandle: HTMLElement | null = null;
  private boundMouseUp: () => void;

  constructor(options: WindowDragOptions) {
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.initialize(options.dragHandleId);
  }

  private initialize(dragHandleId: string): void {
    this.dragHandle = document.getElementById(dragHandleId);
    if (!this.dragHandle) {
      console.warn(`WindowDrag: element with id "${dragHandleId}" not found`);
      return;
    }

    this.dragHandle.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private async handleMouseDown(e: MouseEvent): Promise<void> {
    if (e.button !== 0) return; // Только левая кнопка мыши

    // Передаём offset в main process, который будет polling курсор
    await window.electronAPI.window.startDrag(e.clientX, e.clientY);

    // Предотвращаем выделение текста
    e.preventDefault();
  }

  private async handleMouseUp(): Promise<void> {
    await window.electronAPI.window.endDrag();
  }

  /**
   * Очистка event listeners
   */
  public destroy(): void {
    if (this.dragHandle) {
      this.dragHandle.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    }
    document.removeEventListener('mouseup', this.boundMouseUp);
  }
}
