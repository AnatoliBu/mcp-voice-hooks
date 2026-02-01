import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import { WindowManager } from './window-manager';
import { MCPIntegration } from './mcp-integration';

let mainWindow: BrowserWindow | null = null;
let windowManager: WindowManager | null = null;
let mcpIntegration: MCPIntegration | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Инициализация Window Manager
  windowManager = new WindowManager(mainWindow);

  // Инициализация MCP Integration
  // Получаем порт из переменной окружения или используем значение по умолчанию
  const mcpPort = process.env.MCP_VOICE_HOOKS_PORT || '5111';
  mcpIntegration = new MCPIntegration(mainWindow, `http://localhost:${mcpPort}`);

  // В разработке загружаем Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // В production загружаем собранные файлы
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Запуск cursor polling и MCP integration после загрузки окна
  mainWindow.webContents.on('did-finish-load', () => {
    windowManager?.startCursorPolling();
    mcpIntegration?.start();
  });

  mainWindow.on('closed', () => {
    mcpIntegration?.stop();
    mcpIntegration = null;
    windowManager?.destroy();
    windowManager = null;
    mainWindow = null;
  });
}

// IPC Handler для voice API
ipcMain.handle('voice:get-state', async () => {
  return mcpIntegration?.getCurrentState() || {
    state: 'idle',
    timestamp: Date.now()
  };
});

app.whenReady().then(() => {
  createWindow();

  // Регистрация глобального hotkey для Settings
  // Cmd+, на macOS, Ctrl+, на Windows/Linux
  const settingsShortcut = process.platform === 'darwin'
    ? 'Command+,'
    : 'Control+,';

  const registered = globalShortcut.register(settingsShortcut, () => {
    console.log(`${settingsShortcut} pressed - toggling settings`);
    windowManager?.toggleSettingsWindow();
  });

  if (registered) {
    console.log(`Settings hotkey ${settingsShortcut} registered`);
  } else {
    console.error(`Failed to register settings hotkey ${settingsShortcut}`);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});
