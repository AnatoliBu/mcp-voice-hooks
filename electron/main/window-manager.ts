import { BrowserWindow, screen, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface WindowConfig {
  position: { x: number; y: number };
  visible: boolean;
  alwaysOnTop: boolean;
}

interface InteractiveRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WindowManager {
  private window: BrowserWindow;
  private cursorPollInterval: NodeJS.Timeout | null = null;
  private interactiveRegions: InteractiveRegion[] = [];
  private isDragging = false;
  private configPath: string;
  private lastIgnoreMouseEventsState: boolean | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.configPath = path.join(
      os.homedir(),
      '.mcp-voice-hooks',
      'electron-config.json'
    );
    this.setupIpcHandlers();
    this.loadConfig();
  }

  /**
   * Загрузка конфигурации из файла
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const config: WindowConfig = JSON.parse(
          fs.readFileSync(this.configPath, 'utf-8')
        );

        // Валидация и восстановление позиции
        const validatedPosition = this.validatePosition(
          config.position.x,
          config.position.y
        );
        this.window.setPosition(validatedPosition.x, validatedPosition.y);

        // Восстановление других настроек
        if (config.visible !== undefined) {
          config.visible ? this.window.show() : this.window.hide();
        }
        if (config.alwaysOnTop !== undefined) {
          this.window.setAlwaysOnTop(config.alwaysOnTop);
        }
      } else {
        // Используем defaults
        this.setDefaultPosition();
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      this.setDefaultPosition();
    }
  }

  /**
   * Сохранение конфигурации в файл
   */
  private saveConfig(): void {
    try {
      const bounds = this.window.getBounds();
      const config: WindowConfig = {
        position: { x: bounds.x, y: bounds.y },
        visible: this.window.isVisible(),
        alwaysOnTop: this.window.isAlwaysOnTop()
      };

      // Создаем директорию если не существует
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  /**
   * Установка позиции по умолчанию (правый верхний угол с отступом)
   */
  private setDefaultPosition(): void {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const windowWidth = this.window.getBounds().width;

    const x = screenWidth - windowWidth - 20;
    const y = 20;

    this.window.setPosition(x, y);
  }

  /**
   * Валидация позиции окна (не за пределами экрана)
   */
  private validatePosition(x: number, y: number): { x: number; y: number } {
    const displays = screen.getAllDisplays();
    const windowBounds = this.window.getBounds();

    // Проверяем, находится ли окно хотя бы частично на одном из дисплеев
    const isOnScreen = displays.some(display => {
      const { x: dx, y: dy, width, height } = display.bounds;
      return (
        x + windowBounds.width > dx &&
        x < dx + width &&
        y + windowBounds.height > dy &&
        y < dy + height
      );
    });

    if (isOnScreen) {
      return { x, y };
    }

    // Если окно вне всех экранов, возвращаем на primary display
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const windowWidth = this.window.getBounds().width;

    return {
      x: screenWidth - windowWidth - 20,
      y: 20
    };
  }

  /**
   * Настройка IPC handlers для взаимодействия с renderer
   */
  private setupIpcHandlers(): void {
    // Управление позицией
    ipcMain.handle('window:set-position', async (_event, x: number, y: number) => {
      const validated = this.validatePosition(x, y);
      this.window.setPosition(validated.x, validated.y);
      this.saveConfig();
      return validated;
    });

    // Управление видимостью
    ipcMain.handle('window:set-visible', async (_event, visible: boolean) => {
      visible ? this.window.show() : this.window.hide();
      this.saveConfig();
      return visible;
    });

    // Управление always-on-top
    ipcMain.handle('window:set-always-on-top', async (_event, alwaysOnTop: boolean) => {
      this.window.setAlwaysOnTop(alwaysOnTop);
      this.saveConfig();
      return alwaysOnTop;
    });

    // Drag & drop handlers
    ipcMain.handle('window:start-drag', async () => {
      this.isDragging = true;
      this.stopCursorPolling();
      this.window.setIgnoreMouseEvents(false);
    });

    ipcMain.handle('window:update-drag-position', async (_event, screenX: number, screenY: number, offsetX: number, offsetY: number) => {
      if (!this.isDragging) return;

      const x = screenX - offsetX;
      const y = screenY - offsetY;
      const validated = this.validatePosition(x, y);

      this.window.setPosition(validated.x, validated.y);
    });

    ipcMain.handle('window:end-drag', async () => {
      this.isDragging = false;
      this.saveConfig();
      this.startCursorPolling();
    });

    // Обновление интерактивных зон
    ipcMain.handle('window:update-interactive-regions', async (_event, regions: InteractiveRegion[]) => {
      this.interactiveRegions = regions;
    });

    // Получение текущего состояния
    ipcMain.handle('window:get-state', async () => {
      const bounds = this.window.getBounds();
      return {
        position: { x: bounds.x, y: bounds.y },
        visible: this.window.isVisible(),
        alwaysOnTop: this.window.isAlwaysOnTop()
      };
    });
  }

  /**
   * Запуск cursor polling для click-through функциональности
   */
  public startCursorPolling(): void {
    if (this.cursorPollInterval) {
      return; // Уже запущен
    }

    this.cursorPollInterval = setInterval(() => {
      if (this.isDragging) {
        return; // Не переключаем click-through во время drag
      }

      const cursorPos = screen.getCursorScreenPoint();
      const windowBounds = this.window.getBounds();

      // Проверка: курсор над окном?
      const isOverWindow =
        cursorPos.x >= windowBounds.x &&
        cursorPos.x <= windowBounds.x + windowBounds.width &&
        cursorPos.y >= windowBounds.y &&
        cursorPos.y <= windowBounds.y + windowBounds.height;

      if (!isOverWindow) {
        this.setIgnoreMouseEvents(true);
        return;
      }

      // Проверка: курсор над интерактивным элементом?
      const relativeX = cursorPos.x - windowBounds.x;
      const relativeY = cursorPos.y - windowBounds.y;

      const isOverInteractive = this.interactiveRegions.some(region =>
        relativeX >= region.x &&
        relativeX <= region.x + region.width &&
        relativeY >= region.y &&
        relativeY <= region.y + region.height
      );

      this.setIgnoreMouseEvents(!isOverInteractive);
    }, 50); // 50ms = 20 fps, хороший баланс производительности
  }

  /**
   * Остановка cursor polling
   */
  public stopCursorPolling(): void {
    if (this.cursorPollInterval) {
      clearInterval(this.cursorPollInterval);
      this.cursorPollInterval = null;
    }
  }

  /**
   * Установка ignore mouse events с защитой от лишних вызовов
   */
  private setIgnoreMouseEvents(ignore: boolean): void {
    if (this.lastIgnoreMouseEventsState === ignore) {
      return; // Уже в нужном состоянии
    }

    this.lastIgnoreMouseEventsState = ignore;

    // Windows требует forward опцию для корректной работы
    if (process.platform === 'win32') {
      this.window.setIgnoreMouseEvents(ignore, { forward: true });
    } else {
      this.window.setIgnoreMouseEvents(ignore);
    }
  }

  /**
   * Cleanup при закрытии окна
   */
  public destroy(): void {
    this.stopCursorPolling();
    this.saveConfig();
  }
}
