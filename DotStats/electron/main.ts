import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;

// 允许的导航域名
const ALLOWED_ORIGINS = isDev
  ? ['http://localhost:5174', 'http://localhost:3000']
  : ['file://'];

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
    },
  });

  // CSP: Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: http://localhost:*; img-src 'self' data:; font-src 'self' data:;"
            : "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: wss:;",
        ],
      },
    });
  });

  // 拦截非法导航（防钓鱼）
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const targetUrl = new URL(url);
    const isAllowed = ALLOWED_ORIGINS.some((origin) => {
      try {
        const allowed = new URL(origin);
        return targetUrl.origin === allowed.origin;
      } catch {
        return url.startsWith(origin);
      }
    });
    if (!isAllowed) {
      console.warn(`[Security] Blocked navigation to: ${url}`);
      event.preventDefault();
    }
  });

  // 拦截新窗口打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`[Security] Blocked window.open to: ${url}`);
    return { action: 'deny' };
  });

  // IPC: 窗口控制
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.on('window:toggle-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
