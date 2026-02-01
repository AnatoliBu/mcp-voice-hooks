import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { WindowManager } from './window-manager';

let mainWindow: BrowserWindow | null = null;
let windowManager: WindowManager | null = null;

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

  // В разработке загружаем Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // В production загружаем собранные файлы
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Запуск cursor polling после загрузки окна
  mainWindow.webContents.on('did-finish-load', () => {
    windowManager?.startCursorPolling();
  });

  mainWindow.on('closed', () => {
    windowManager?.destroy();
    windowManager = null;
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

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
