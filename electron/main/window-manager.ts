import { BrowserWindow, screen, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import Store from 'electron-store';
import { AppSettings, DEFAULT_SETTINGS, SETTINGS_SCHEMA } from './types';

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
  private overlayWindow: BrowserWindow;
  private settingsWindow: BrowserWindow | null = null;
  private cursorPollInterval: NodeJS.Timeout | null = null;
  private interactiveRegions: InteractiveRegion[] = [];
  private isDragging = false;
  private configPath: string;
  private lastIgnoreMouseEventsState: boolean | null = null;
  private store: Store<AppSettings>;

  constructor(overlayWindow: BrowserWindow) {
    this.overlayWindow = overlayWindow;
    this.configPath = path.join(
      os.homedir(),
      '.mcp-voice-hooks',
      'electron-config.json'
    );

    // Инициализация electron-store с schema
    this.store = new Store<AppSettings>({
      schema: SETTINGS_SCHEMA as any,
      defaults: DEFAULT_SETTINGS
    });

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
        this.overlayWindow.setPosition(validatedPosition.x, validatedPosition.y);

        // Восстановление других настроек
        if (config.visible !== undefined) {
          config.visible ? this.overlayWindow.show() : this.overlayWindow.hide();
        }
        if (config.alwaysOnTop !== undefined) {
          this.overlayWindow.setAlwaysOnTop(config.alwaysOnTop);
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
      const bounds = this.overlayWindow.getBounds();
      const config: WindowConfig = {
        position: { x: bounds.x, y: bounds.y },
        visible: this.overlayWindow.isVisible(),
        alwaysOnTop: this.overlayWindow.isAlwaysOnTop()
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
    const windowWidth = this.overlayWindow.getBounds().width;

    const x = screenWidth - windowWidth - 20;
    const y = 20;

    this.overlayWindow.setPosition(x, y);
  }

  /**
   * Валидация позиции окна (не за пределами экрана)
   */
  private validatePosition(x: number, y: number): { x: number; y: number } {
    const displays = screen.getAllDisplays();
    const windowBounds = this.overlayWindow.getBounds();

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
    const windowWidth = this.overlayWindow.getBounds().width;

    return {
      x: screenWidth - windowWidth - 20,
      y: 20
    };
  }

  /**
   * Создание settings window (lazy)
   */
  public createSettingsWindow(): void {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      return; // Already created
    }

    this.settingsWindow = new BrowserWindow({
      width: 300,
      height: 500,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false, // Скрыто по умолчанию
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    // Позиционирование относительно overlay
    this.positionSettingsWindow();

    // В разработке загружаем Vite dev server
    if (process.env.VITE_DEV_SERVER_URL) {
      this.settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/settings.html`);
    } else {
      // В production загружаем собранные файлы
      this.settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));
    }

    // Auto-hide при потере фокуса
    this.settingsWindow.on('blur', () => {
      if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
        this.settingsWindow.hide();
      }
    });

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  /**
   * Toggle settings window visibility
   */
  public async toggleSettingsWindow(): Promise<void> {
    // Создать если еще не создано
    if (!this.settingsWindow || this.settingsWindow.isDestroyed()) {
      this.createSettingsWindow();
    }

    if (this.settingsWindow!.isVisible()) {
      this.settingsWindow!.hide();
    } else {
      // Позиционируем перед показом
      this.positionSettingsWindow();
      this.settingsWindow!.show();
      this.settingsWindow!.focus();
    }
  }

  /**
   * Позиционирование settings window относительно overlay
   */
  private positionSettingsWindow(): void {
    if (!this.settingsWindow || this.settingsWindow.isDestroyed()) {
      return;
    }

    const overlayBounds = this.overlayWindow.getBounds();
    const settingsBounds = this.settingsWindow.getBounds();

    // Позиция: слева от overlay с небольшим отступом
    const x = overlayBounds.x - settingsBounds.width - 10;
    const y = overlayBounds.y;

    this.settingsWindow.setPosition(x, y);
  }

  /**
   * Настройка IPC handlers для взаимодействия с renderer
   */
  private setupIpcHandlers(): void {
    this.setupWindowHandlers();
    this.setupSettingsHandlers();
  }

  /**
   * Window management IPC handlers
   */
  private setupWindowHandlers(): void {
    // Управление позицией
    ipcMain.handle('window:set-position', async (_event, x: number, y: number) => {
      const validated = this.validatePosition(x, y);
      this.overlayWindow.setPosition(validated.x, validated.y);
      this.saveConfig();
      return validated;
    });

    // Управление видимостью
    ipcMain.handle('window:set-visible', async (_event, visible: boolean) => {
      visible ? this.overlayWindow.show() : this.overlayWindow.hide();
      this.saveConfig();
      return visible;
    });

    // Управление always-on-top
    ipcMain.handle('window:set-always-on-top', async (_event, alwaysOnTop: boolean) => {
      this.overlayWindow.setAlwaysOnTop(alwaysOnTop);
      this.saveConfig();
      return alwaysOnTop;
    });

    // Drag & drop handlers
    ipcMain.handle('window:start-drag', async () => {
      this.isDragging = true;
      this.stopCursorPolling();
      this.overlayWindow.setIgnoreMouseEvents(false);
    });

    ipcMain.handle('window:update-drag-position', async (_event, screenX: number, screenY: number, offsetX: number, offsetY: number) => {
      if (!this.isDragging) return;

      const x = screenX - offsetX;
      const y = screenY - offsetY;
      const validated = this.validatePosition(x, y);

      this.overlayWindow.setPosition(validated.x, validated.y);
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
      const bounds = this.overlayWindow.getBounds();
      return {
        position: { x: bounds.x, y: bounds.y },
        visible: this.overlayWindow.isVisible(),
        alwaysOnTop: this.overlayWindow.isAlwaysOnTop()
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
      const windowBounds = this.overlayWindow.getBounds();

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
      this.overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
    } else {
      this.overlayWindow.setIgnoreMouseEvents(ignore);
    }
  }

  /**
   * Settings IPC handlers
   */
  private setupSettingsHandlers(): void {
    // Toggle settings window
    ipcMain.handle('window:toggle-settings', async () => {
      await this.toggleSettingsWindow();
    });

    // Get settings
    ipcMain.handle('settings:get', async () => {
      return this.store.store;
    });

    // Set settings (partial update)
    ipcMain.handle('settings:set', async (_event, settings: Partial<AppSettings>) => {
      // Merge with existing settings
      const currentSettings = this.store.store;
      const newSettings = { ...currentSettings, ...settings };

      // Update store
      this.store.store = newSettings;

      // Broadcast change to all windows
      this.broadcastSettingsChange(newSettings);

      return newSettings;
    });

    // Reset settings to defaults
    ipcMain.handle('settings:reset', async () => {
      this.store.clear();
      const defaultSettings = DEFAULT_SETTINGS;

      // Broadcast change to all windows
      this.broadcastSettingsChange(defaultSettings);

      return defaultSettings;
    });
  }

  /**
   * Broadcast settings change to all renderer processes
   */
  private broadcastSettingsChange(settings: AppSettings): void {
    // Send to overlay window
    if (!this.overlayWindow.isDestroyed()) {
      this.overlayWindow.webContents.send('settings:changed', settings);
    }

    // Send to settings window if exists
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.webContents.send('settings:changed', settings);
    }
  }

  /**
   * Cleanup при закрытии окна
   */
  public destroy(): void {
    this.stopCursorPolling();
    this.saveConfig();

    // Close settings window if open
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.close();
      this.settingsWindow = null;
    }
  }
}
