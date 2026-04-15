import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { translationRouter } from '../src/workers/translation/router';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = !app.isPackaged;

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 560,
    minWidth: 420,
    minHeight: 400,
    frame: false,
    transparent: true,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return mainWindow;
}

function createTray(): void {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, isDev ? '../../assets/tray.png' : '../assets/tray.png')
  );
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setToolTip('DotTranslator');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();

  // 全局快捷键 Alt+Space
  globalShortcut.register('Alt+Space', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  // IPC: 窗口控制
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:close', () => mainWindow?.hide());
  ipcMain.on('window:toggle-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  // IPC: 翻译
  ipcMain.handle('translation:translate', async (_event, params) => {
    const { settings } = await import('../src/shared/constants');
    return translationRouter.translateCompare(params, params.enabledProviders || ['google']);
  });

  ipcMain.handle('translation:getProviders', () => {
    return translationRouter.getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      requiresApiKey: p.requiresApiKey,
    }));
  });

  ipcMain.handle('translation:detectLanguage', async (_event, text: string) => {
    const providers = translationRouter.getAllProviders();
    for (const p of providers) {
      try {
        const available = await p.isAvailable();
        if (available) return p.detectLanguage(text);
      } catch { /* try next */ }
    }
    throw new Error('No available provider for language detection');
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
