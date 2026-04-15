import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, session } from 'electron';
import path from 'path';
import { translationRouter } from '../src/workers/translation/router';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let floatingBall: BrowserWindow | null = null;
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

// ========== 悬浮球 48×48 常驻圆形 ==========
function createFloatingBall(): void {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  floatingBall = new BrowserWindow({
    width: 48,
    height: 48,
    x: screenWidth - 80,
    y: screenHeight / 2 - 24,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    roundedCorners: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  floatingBall.on('closed', () => {
    floatingBall = null;
  });

  const ballHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  width:48px;height:48px;overflow:hidden;
  background:rgba(99,102,241,0.9);
  border-radius:50%;cursor:grab;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 12px rgba(0,0,0,0.3);
  transition:all 0.2s;
  -webkit-app-region:drag;
  user-select:none;
}
body:hover{
  background:rgba(79,70,229,1);
  box-shadow:0 4px 20px rgba(99,102,241,0.5);
  transform:scale(1.1);
}
body:active{cursor:grabbing}
.ball-icon{font-size:20px;-webkit-app-region:no-drag;pointer-events:auto}
</style></head>
<body onclick="window.electronAPI?.pip?.close()">
  <span class="ball-icon" id="icon">✦</span>
  <script>
    const { ipcRenderer } = require('electron');
    let clickTimer = null;
    document.body.addEventListener('click', (e) => {
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; ipcRenderer.send('floating:double-click'); return; }
      clickTimer = setTimeout(() => { clickTimer = null; ipcRenderer.send('floating:click'); }, 250);
    });
    ipcRenderer.on('floating:update-icon', (_e, text) => {
      document.getElementById('icon').textContent = text || '✦';
    });
  </script>
</body></html>`;

  floatingBall.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(ballHtml)}`);
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  createFloatingBall();

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

  // IPC: 悬浮球事件
  ipcMain.on('floating:click', () => {
    // 单击 → 显示/隐藏主窗口
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  ipcMain.on('floating:double-click', () => {
    // 双击 → 最近一次翻译结果发送到悬浮球显示
    mainWindow?.webContents.send('floating:request-last-result');
  });

  ipcMain.on('floating:update', (_event, text: string) => {
    floatingBall?.webContents.send('floating:update-icon', text ? text.slice(0, 1) : '✦');
  });

  ipcMain.on('floating:hide', () => {
    floatingBall?.hide();
  });

  ipcMain.on('floating:show', () => {
    floatingBall?.show();
  });

  // IPC: 迷你卡片
  ipcMain.on('mini-card:auto-hide', () => {
    miniCard?.hide();
  });

  // IPC: 真正退出应用
  ipcMain.on('app:quit', () => {
    isQuitting = true;
    app.quit();
  });

  // ========== safeStorage API Key 加密存储 ==========
  const { safeStorage } = require('electron');
  const keyStorePath = path.join(app.getPath('userData'), 'encrypted_keys.dat');
  const fs = require('fs');

  function loadEncryptedKeys(): Record<string, string> {
    try {
      if (!fs.existsSync(keyStorePath)) return {};
      const encrypted = fs.readFileSync(keyStorePath);
      const decrypted = safeStorage.decryptString(encrypted);
      return JSON.parse(decrypted);
    } catch { return {}; }
  }

  function saveEncryptedKeys(keys: Record<string, string>): void {
    const encrypted = safeStorage.encryptString(JSON.stringify(keys));
    fs.writeFileSync(keyStorePath, encrypted);
  }

  ipcMain.handle('secure-storage:get', (_event, key: string) => {
    const keys = loadEncryptedKeys();
    return keys[key] || null;
  });

  ipcMain.handle('secure-storage:set', (_event, key: string, value: string) => {
    const keys = loadEncryptedKeys();
    keys[key] = value;
    saveEncryptedKeys(keys);
  });

  ipcMain.handle('secure-storage:delete', (_event, key: string) => {
    const keys = loadEncryptedKeys();
    delete keys[key];
    saveEncryptedKeys(keys);
  });

  ipcMain.handle('secure-storage:is-available', () => {
    return safeStorage.isEncryptionAvailable();
  });

  // ========== 剪贴板监听 + 安全过滤 ==========
  let lastClipboardText = '';
  let clipboardMonitorEnabled = true;

  // 迷你卡片窗口
  let miniCard: BrowserWindow | null = null;
  let miniCardTimer: ReturnType<typeof setTimeout> | null = null;

  function showMiniCard(text: string, sourceLang: string, targetLang: string): void {
    const { screen } = require('electron');
    const { mouse } = screen.getCursorScreenPoint();
    const cursorPos = screen.getCursorScreenPoint();

    if (miniCard && !miniCard.isDestroyed()) {
      miniCard.webContents.send('mini-card:update', { text, sourceLang, targetLang });
      miniCard.setPosition(cursorPos.x + 20, cursorPos.y - 40);
      miniCard.show();
    } else {
      miniCard = new BrowserWindow({
        width: 200,
        height: 80,
        x: cursorPos.x + 20,
        y: cursorPos.y - 40,
        frame: false,
        transparent: true,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: true,
        roundedCorners: true,
        backgroundColor: '#00000000',
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });

      const cardHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  width:200px;height:80px;overflow:hidden;
  background:rgba(30,41,59,0.95);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-radius:10px;border:1px solid rgba(255,255,255,0.1);
  box-shadow:0 8px 24px rgba(0,0,0,0.4);
  padding:10px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  color:#f1f5f9;-webkit-app-region:drag;
}
.lang{font-size:10px;color:#64748b;margin-bottom:4px}
.text{font-size:13px;line-height:1.4;word-break:break-all;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
</style></head>
<body>
  <div class="lang" id="lang"></div>
  <div class="text" id="text">等待翻译...</div>
  <script>
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('mini-card:update', (_e, data) => {
      document.getElementById('lang').textContent = data.sourceLang + ' → ' + data.targetLang;
      document.getElementById('text').textContent = data.text;
    });
    setTimeout(() => ipcRenderer.send('mini-card:auto-hide'), 5000);
  </script>
</body></html>`;

      miniCard.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(cardHtml)}`);
      miniCard.on('closed', () => { miniCard = null; });

      miniCard.webContents.once('did-finish-load', () => {
        miniCard?.webContents.send('mini-card:update', { text, sourceLang, targetLang });
      });
    }

    // 5秒后自动隐藏
    if (miniCardTimer) clearTimeout(miniCardTimer);
    miniCardTimer = setTimeout(() => { miniCard?.hide(); }, 5000);
  }

  // 敏感内容黑名单正则
  const CLIPBOARD_BLACKLIST = [
    /\d{16}/,                                    // 信用卡号（16位连续数字）
    /1[3-9]\d{9}/,                               // 中国手机号
    /(?=.*[a-z])(?=.*\d)[a-z\d]{8,}/i,           // 密码模式（字母+数字混合≥8位）
    /\d{6}/,                                     // 验证码（6位数字）
  ];

  function isSensitiveContent(text: string): boolean {
    return CLIPBOARD_BLACKLIST.some((regex) => regex.test(text));
  }

  function startClipboardMonitor(): void {
    setInterval(() => {
      if (!clipboardMonitorEnabled || !mainWindow) return;
      try {
        const { clipboard } = require('electron');
        const text = clipboard.readText();
        if (!text || text.trim() === '' || text === lastClipboardText) return;
        if (isSensitiveContent(text)) return;
        lastClipboardText = text;
        mainWindow.webContents.send('clipboard:changed', text);

        // 主窗口隐藏时显示迷你卡片
        if (!mainWindow.isVisible()) {
          showMiniCard(text, 'auto', 'zh');
        }
      } catch { /* 静默 */ }
    }, 1000);
  }

  startClipboardMonitor();

  ipcMain.on('clipboard:monitor-toggle', (_event, enabled: boolean) => {
    clipboardMonitorEnabled = enabled;
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

  // IPC: TM 精确匹配
  ipcMain.handle('tm:lookup', async (_event, text: string, sourceLang: string, targetLang: string) => {
    const { tmLookup, tmInsert } = await import('../src/main/database');
    const match = tmLookup(sourceLang, targetLang, text);
    return match;
  });

  ipcMain.handle('tm:insert', async (_event, text: string, targetText: string, sourceLang: string, targetLang: string) => {
    const { tmInsert } = await import('../src/main/database');
    tmInsert({ sourceLang, targetLang, sourceText: text, targetText, usageCount: 1 });
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
