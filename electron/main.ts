import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, session } from 'electron';
import path from 'path';
import { telemetry } from '../src/telemetry/reporter';
import { registerSecureStorageIPC } from './secure-storage';
import { startClipboardMonitor, stopClipboardMonitor, registerClipboardIPC } from './clipboard-monitor';
import { startLocalApiServer, registerLocalApiIPC } from './local-api';
import { registerAllIPC } from './ipc-handlers';
import { APP_VERSION } from '../src/shared/constants';
import { initAutoUpdater } from './auto-updater';

// ========== 窗口引用 ==========
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pipWindow: BrowserWindow | null = null;
let isQuitting = false;
let currentTheme = 'light';

const isDev = !app.isPackaged;
const ALLOWED_ORIGINS = isDev ? ['http://localhost:5173'] : ['file://'];

// ========== 单例锁：防止多开 ==========
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ========== 创建托盘图标（程序化生成，无需外部文件）==========
function createTrayIcon(): Electron.NativeImage {
  const size = 32;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    <defs>
      <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#818cf8"/>
        <stop offset="100%" stop-color="#6366f1"/>
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="30" height="30" rx="7" fill="url(#tg)"/>
    <text x="9" y="14" font-size="11" font-weight="bold" fill="white" font-family="Arial, sans-serif">A</text>
    <text x="17" y="25" font-size="11" font-weight="bold" fill="rgba(255,255,255,0.85)" font-family="Arial, sans-serif">文</text>
    <path d="M14 5 L19 8.5 L14 12" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 20 L7 23.5 L12 27" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  const buffer = Buffer.from(svg);
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

// ========== 主窗口 ==========
function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 680,
    minWidth: 420,
    minHeight: 480,
    frame: false,
    transparent: true,
    resizable: true,
    show: false,
    roundedCorners: true,
    backgroundColor: '#00000000',
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

  // CSP: Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: http://localhost:*; img-src 'self' data:; font-src 'self' data:;"
            : "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;",
        ],
      },
    });
  });

  // 拦截非法导航
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const targetUrl = new URL(url);
    const isAllowed = ALLOWED_ORIGINS.some((origin) => {
      try {
        return targetUrl.origin === new URL(origin).origin;
      } catch {
        return url.startsWith(origin);
      }
    });
    if (!isAllowed) {
      console.warn(`[Security] Blocked navigation to: ${url}`);
      event.preventDefault();
    }
  });

  // 拦截新窗口
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`[Security] Blocked window.open to: ${url}`);
    return { action: 'deny' };
  });

  // 点击关闭按钮 → 最小化到托盘（不退出）
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
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

// ========== 系统托盘 ==========
function createTray(): void {
  if (tray && !tray.isDestroyed()) return;

  const icon = createTrayIcon();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip(`DotTranslator v${APP_VERSION} - 即时翻译`);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ========== 应用启动 ==========
app.whenReady().then(() => {
  createMainWindow();
  createTray();

  // 启动遥测
  telemetry.start();

  // 注册 IPC 处理器（来自独立模块）
  registerAllIPC(
    { mainWindow, pipWindow, miniCard: null },
    {
      setMainWindow: (win) => {
        mainWindow = win;
      },
      setPipWindow: (win) => {
        pipWindow = win;
      },
      setMiniCard: () => {},
      setIsQuitting: (v) => {
        isQuitting = v;
      },
      getCurrentTheme: () => currentTheme,
    }
  );

  // 注册模块化 IPC
  registerSecureStorageIPC();
  registerClipboardIPC();
  registerLocalApiIPC();

  // 启动剪贴板监听
  startClipboardMonitor(() => mainWindow);

  // 启动本地 HTTP API
  startLocalApiServer();

  // 启动自动更新（生产模式延迟 5s 检查）
  initAutoUpdater(() => mainWindow);
});

// ========== 生命周期 ==========
app.on('before-quit', () => {
  isQuitting = true;
  telemetry.stop();
  stopClipboardMonitor();
  // 异步清理 OCR worker（尽力而为）
  import('./ocr-worker').then((m) => m.destroyOcrWorker()).catch(() => {});
  if (pipWindow && !pipWindow.isDestroyed()) pipWindow.destroy();
  if (tray && !tray.isDestroyed()) tray.destroy();
});

app.on('will-quit', () => {
  require('electron').globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});
