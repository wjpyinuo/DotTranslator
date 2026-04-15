import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, session } from 'electron';
import path from 'path';
import { translationRouter } from '../src/workers/translation/router';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = !app.isPackaged;
const ALLOWED_ORIGINS = isDev
  ? ['http://localhost:5173']
  : ['file://'];

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
  // 生成一个简单的 SVG 转 nativeImage 作为托盘图标
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7" fill="#6366f1" stroke="#4f46e5" stroke-width="1"/>
    <text x="8" y="12" text-anchor="middle" font-size="10" font-weight="bold" fill="white" font-family="Arial">D</text>
  </svg>`;
  const buffer = Buffer.from(svg);
  return nativeImage.createFromBuffer(buffer, { width: 16, height: 16 });
}

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

function createTray(): void {
  // 防止重复创建托盘
  if (tray && !tray.isDestroyed()) {
    return;
  }

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

  tray.setToolTip('DotTranslator - 即时翻译');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
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

  // IPC: 真正退出应用
  ipcMain.on('app:quit', () => {
    isQuitting = true;
    app.quit();
  });

  // IPC: 翻译
  ipcMain.handle('translation:translate', async (_event, params) => {
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

  // IPC: 悬浮球 - 创建 PiP 小窗口
  let pipWindow: BrowserWindow | null = null;

  ipcMain.on('pip:show', (_event, data: { text: string; sourceLang: string; targetLang: string }) => {
    if (pipWindow && !pipWindow.isDestroyed()) {
      pipWindow.show();
      pipWindow.focus();
      pipWindow.webContents.send('pip:update', data);
      return;
    }

    // 获取主窗口位置以在其旁边显示 PiP
    const mainBounds = mainWindow?.getBounds();
    const pipX = mainBounds ? mainBounds.x + mainBounds.width + 10 : 100;
    const pipY = mainBounds ? mainBounds.y : 100;

    pipWindow = new BrowserWindow({
      width: 320,
      height: 160,
      x: pipX,
      y: pipY,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      roundedCorners: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    pipWindow.on('closed', () => {
      pipWindow = null;
    });

    // PiP 使用独立的 HTML
    const pipHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(40px) saturate(1.5);
      -webkit-backdrop-filter: blur(40px) saturate(1.5);
      color: #f1f5f9;
      border-radius: 16px;
      overflow: hidden;
      height: 100vh;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .pip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      -webkit-app-region: drag;
      background: rgba(30, 41, 59, 0.6);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .pip-title {
      font-size: 12px;
      font-weight: 600;
      color: #818cf8;
    }
    .pip-close {
      -webkit-app-region: no-drag;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 14px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .pip-close:hover { background: rgba(239,68,68,0.8); color: white; }
    .pip-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .pip-lang {
      font-size: 11px;
      color: #64748b;
    }
    .pip-text {
      font-size: 14px;
      line-height: 1.5;
      color: #f1f5f9;
      word-break: break-word;
    }
    .pip-actions {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }
    .pip-btn {
      padding: 4px 10px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      background: transparent;
      color: #94a3b8;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pip-btn:hover { background: #818cf8; color: white; border-color: #818cf8; }
  </style>
</head>
<body>
  <div class="pip-header">
    <span class="pip-title">✦ DotTranslator</span>
    <button class="pip-close" onclick="window.electronAPI?.window.close()">✕</button>
  </div>
  <div class="pip-body">
    <div class="pip-lang" id="lang">加载中...</div>
    <div class="pip-text" id="text">等待翻译结果...</div>
    <div class="pip-actions">
      <button class="pip-btn" id="copyBtn">📋 复制</button>
      <button class="pip-btn" id="speakBtn">🔊 朗读</button>
    </div>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    let currentText = '';
    let currentLang = 'zh';

    ipcRenderer.on('pip:update', (_e, data) => {
      currentText = data.text || '';
      currentLang = data.targetLang || 'zh';
      document.getElementById('lang').textContent = data.sourceLang + ' → ' + data.targetLang;
      document.getElementById('text').textContent = data.text || '无结果';
    });

    document.getElementById('copyBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(currentText);
    });
    document.getElementById('speakBtn').addEventListener('click', () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(currentText);
        const map = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' };
        u.lang = map[currentLang] || currentLang;
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
    });
  </script>
</body>
</html>`;

    pipWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pipHtml)}`);

    // 发送初始数据
    pipWindow.webContents.once('did-finish-load', () => {
      pipWindow?.webContents.send('pip:update', data);
    });
  });

  ipcMain.on('pip:hide', () => {
    pipWindow?.hide();
  });

  ipcMain.on('pip:close', () => {
    pipWindow?.close();
  });

  // IPC: 公告栏 - 从服务器获取公告内容
  ipcMain.handle('announcement:fetch', async (_event, url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.error('[Announcement] fetch failed:', err);
      return '';
    }
  });

  // IPC: 本地统计
  ipcMain.handle('stats:get', async () => {
    const { getLocalStats, getHistory } = await import('../src/main/database');
    const stats = getLocalStats(30);
    const history = getHistory(1000);

    const totalTranslations = stats.length;
    const totalChars = stats.reduce((sum, s) => sum + (s.charCount || 0), 0);
    const avgLatency = stats.length > 0
      ? stats.reduce((sum, s) => sum + (s.latencyMs || 0), 0) / stats.length
      : 0;

    const providerDistribution: Record<string, number> = {};
    for (const s of stats) {
      if (s.provider) {
        providerDistribution[s.provider] = (providerDistribution[s.provider] || 0) + 1;
      }
    }

    const pairCounts: Record<string, number> = {};
    for (const h of history) {
      const pair = `${h.sourceLang} → ${h.targetLang}`;
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    }
    const topLanguagePairs = Object.entries(pairCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pair, count]) => ({ pair, count }));

    const tmHits = stats.filter((s) => s.tmHit).length;
    const tmHitRate = stats.length > 0 ? tmHits / stats.length : 0;

    return {
      totalTranslations,
      totalChars,
      avgLatency,
      providerDistribution,
      topLanguagePairs,
      tmHitRate,
    };
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 关闭所有窗口时不退出 → 保留在托盘
// 只有通过托盘菜单"退出"或 app:quit IPC 才真正退出
app.on('window-all-closed', () => {
  // 不做任何事，保持托盘运行
});
