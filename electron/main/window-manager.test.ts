/**
 * @jest-environment node
 */

import { BrowserWindow, screen, ipcMain } from 'electron';
import { WindowManager } from './window-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock Electron modules
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  screen: {
    getCursorScreenPoint: jest.fn(),
    getPrimaryDisplay: jest.fn(),
    getAllDisplays: jest.fn()
  },
  ipcMain: {
    handle: jest.fn()
  }
}));

jest.mock('fs');
jest.mock('os');

describe('WindowManager', () => {
  let mockWindow: jest.Mocked<BrowserWindow>;
  let windowManager: WindowManager;

  beforeEach(() => {
    // Mock BrowserWindow instance
    mockWindow = {
      getBounds: jest.fn().mockReturnValue({ x: 100, y: 100, width: 400, height: 200 }),
      setPosition: jest.fn(),
      setIgnoreMouseEvents: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      isVisible: jest.fn().mockReturnValue(true),
      setAlwaysOnTop: jest.fn(),
      isAlwaysOnTop: jest.fn().mockReturnValue(true),
      webContents: {
        on: jest.fn()
      }
    } as unknown as jest.Mocked<BrowserWindow>;

    // Mock screen API
    (screen.getPrimaryDisplay as jest.Mock).mockReturnValue({
      workAreaSize: { width: 1920, height: 1080 }
    });

    (screen.getAllDisplays as jest.Mock).mockReturnValue([
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } }
    ]);

    (screen.getCursorScreenPoint as jest.Mock).mockReturnValue({ x: 150, y: 150 });

    // Mock fs
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    // Mock os
    (os.homedir as jest.Mock).mockReturnValue('/home/test');

    // Clear IPC handlers
    (ipcMain.handle as jest.Mock).mockClear();
  });

  afterEach(() => {
    if (windowManager) {
      windowManager.destroy();
    }
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should create WindowManager instance', () => {
      windowManager = new WindowManager(mockWindow);
      expect(windowManager).toBeDefined();
    });

    it('should set default position when no config exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      windowManager = new WindowManager(mockWindow);

      // Должна быть установлена позиция: правый верхний угол с отступом 20px
      expect(mockWindow.setPosition).toHaveBeenCalledWith(1500, 20); // 1920 - 400 - 20 = 1500
    });

    it('should load position from config if exists', () => {
      const mockConfig = {
        position: { x: 200, y: 300 },
        visible: true,
        alwaysOnTop: false
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      windowManager = new WindowManager(mockWindow);

      expect(mockWindow.setPosition).toHaveBeenCalledWith(200, 300);
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(false);
    });

    it('should setup IPC handlers', () => {
      windowManager = new WindowManager(mockWindow);

      expect(ipcMain.handle).toHaveBeenCalledWith('window:set-position', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('window:set-visible', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('window:set-always-on-top', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('window:start-drag', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('window:update-drag-position', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('window:end-drag', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('window:update-interactive-regions', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('window:get-state', expect.any(Function));
    });
  });

  describe('Position validation', () => {
    beforeEach(() => {
      windowManager = new WindowManager(mockWindow);
    });

    it('should accept valid position within screen bounds', async () => {
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:set-position'
      )[1];

      const result = await handler(null, 100, 100);

      expect(result).toEqual({ x: 100, y: 100 });
      expect(mockWindow.setPosition).toHaveBeenCalledWith(100, 100);
    });

    it('should reset position to default if out of bounds', async () => {
      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:set-position'
      )[1];

      // Позиция полностью вне экрана
      const result = await handler(null, 3000, 3000);

      // Должна вернуться к default позиции
      expect(result).toEqual({ x: 1500, y: 20 });
      expect(mockWindow.setPosition).toHaveBeenCalledWith(1500, 20);
    });
  });

  describe('Cursor polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      windowManager = new WindowManager(mockWindow);
    });

    it('should start cursor polling', () => {
      windowManager.startCursorPolling();

      jest.advanceTimersByTime(50);

      expect(screen.getCursorScreenPoint).toHaveBeenCalled();
    });

    it('should enable ignore mouse events when cursor not over window', () => {
      windowManager.startCursorPolling();

      // Курсор за пределами окна
      (screen.getCursorScreenPoint as jest.Mock).mockReturnValue({ x: 0, y: 0 });

      jest.advanceTimersByTime(50);

      expect(mockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(true);
    });

    it('should disable ignore mouse events when cursor over interactive region', async () => {
      windowManager.startCursorPolling();

      // Обновляем интерактивные регионы
      const updateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:update-interactive-regions'
      )[1];

      await updateHandler(null, [{ x: 50, y: 50, width: 100, height: 50 }]);

      // Курсор над интерактивным регионом (относительно окна)
      (screen.getCursorScreenPoint as jest.Mock).mockReturnValue({ x: 150, y: 150 });
      mockWindow.getBounds.mockReturnValue({ x: 100, y: 100, width: 400, height: 200 });

      jest.advanceTimersByTime(50);

      expect(mockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(false);
    });

    it('should stop cursor polling', () => {
      windowManager.startCursorPolling();

      jest.advanceTimersByTime(50);
      expect(screen.getCursorScreenPoint).toHaveBeenCalled();

      (screen.getCursorScreenPoint as jest.Mock).mockClear();

      windowManager.stopCursorPolling();

      jest.advanceTimersByTime(100);
      expect(screen.getCursorScreenPoint).not.toHaveBeenCalled();
    });

    it('should use forward option on Windows platform', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      windowManager.startCursorPolling();

      // Курсор за пределами окна
      (screen.getCursorScreenPoint as jest.Mock).mockReturnValue({ x: 0, y: 0 });

      jest.advanceTimersByTime(50);

      expect(mockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(true, { forward: true });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Drag & drop', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      windowManager = new WindowManager(mockWindow);
      windowManager.startCursorPolling();
    });

    it('should handle start drag', async () => {
      const startHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:start-drag'
      )[1];

      await startHandler();

      // После start drag курсор polling не должен изменять ignore mouse events
      (screen.getCursorScreenPoint as jest.Mock).mockReturnValue({ x: 0, y: 0 });

      (mockWindow.setIgnoreMouseEvents as jest.Mock).mockClear();

      jest.advanceTimersByTime(50);

      expect(mockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(false);
    });

    it('should update position during drag', async () => {
      const startHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:start-drag'
      )[1];
      const updateHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:update-drag-position'
      )[1];

      await startHandler();
      await updateHandler(null, 300, 400, 50, 50); // screenX, screenY, offsetX, offsetY

      expect(mockWindow.setPosition).toHaveBeenCalledWith(250, 350); // 300-50, 400-50
    });

    it('should end drag and restart cursor polling', async () => {
      const startHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:start-drag'
      )[1];
      const endHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:end-drag'
      )[1];

      await startHandler();
      await endHandler();

      // После end drag курсор polling должен работать нормально
      (screen.getCursorScreenPoint as jest.Mock).mockReturnValue({ x: 0, y: 0 });

      jest.advanceTimersByTime(50);

      expect(mockWindow.setIgnoreMouseEvents).toHaveBeenCalledWith(true);
    });
  });

  describe('Config persistence', () => {
    it('should save config when position changes', async () => {
      windowManager = new WindowManager(mockWindow);

      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:set-position'
      )[1];

      await handler(null, 200, 300);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join('/home/test', '.mcp-voice-hooks', 'electron-config.json'),
        expect.stringContaining('"x": 200'),
        expect.anything()
      );
    });

    it('should create config directory if not exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      windowManager = new WindowManager(mockWindow);

      const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
        call => call[0] === 'window:set-position'
      )[1];

      await handler(null, 200, 300);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join('/home/test', '.mcp-voice-hooks'),
        { recursive: true }
      );
    });
  });

  describe('Cleanup', () => {
    it('should stop polling and save config on destroy', () => {
      jest.useFakeTimers();
      windowManager = new WindowManager(mockWindow);
      windowManager.startCursorPolling();

      windowManager.destroy();

      (screen.getCursorScreenPoint as jest.Mock).mockClear();

      jest.advanceTimersByTime(100);

      expect(screen.getCursorScreenPoint).not.toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
