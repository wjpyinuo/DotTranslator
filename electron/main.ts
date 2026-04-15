import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, session } from 'electron';
import path from 'path';
import { translationRouter } from '../src/workers/translation/router';
import { telemetry } from '../src/telemetry/reporter';

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

  tray.setToolTip('DotTranslator v0.2.0 - 即时翻译');
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
    const api = window.electronAPI?._internal;
    let clickTimer = null;
    document.body.addEventListener('click', (e) => {
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; api?.send('floating:double-click'); return; }
      clickTimer = setTimeout(() => { clickTimer = null; api?.send('floating:click'); }, 250);
    });
    api?.on('floating:update-icon', (text) => {
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

  // 启动遥测
  telemetry.start();

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
  ipcMain.on('window:close', () => {
    isQuitting = true;
    mainWindow?.close();
  });
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
    const api = window.electronAPI?._internal;
    api?.on('mini-card:update', (data) => {
      document.getElementById('lang').textContent = data.sourceLang + ' → ' + data.targetLang;
      document.getElementById('text').textContent = data.text;
    });
    setTimeout(() => api?.send('mini-card:auto-hide'), 5000);
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

  // 敏感内容过滤（精确模式，减少误杀）
  const SENSITIVE_PATTERNS = [
    // 信用卡号：13-19 位连续纯数字，用 Luhn 算法校验
    {
      test: (t: string) => {
        const match = t.match(/\b(\d{13,19})\b/);
        if (!match) return false;
        const digits = match[1];
        // Luhn 校验
        let sum = 0;
        let alt = false;
        for (let i = digits.length - 1; i >= 0; i--) {
          let n = parseInt(digits[i], 10);
          if (alt) { n *= 2; if (n > 9) n -= 9; }
          sum += n;
          alt = !alt;
        }
        return sum % 10 === 0;
      },
    },
    // 中国手机号：1 开头，第二位 3-9，共 11 位纯数字
    { test: (t: string) => /\b1[3-9]\d{9}\b/.test(t) },
    // 中国身份证号：18 位（末位可为 X）
    { test: (t: string) => /\b\d{17}[\dXx]\b/.test(t) },
    // 中国银行卡号：16-19 位纯数字（前缀为已知银行 BIN）
    { test: (t: string) => /\b(?:62|4\d{2}|5[1-5]|3[47])\d{13,16}\b/.test(t) },
  ];

  function isSensitiveContent(text: string): boolean {
    // 仅对 8 字符以上的文本进行检测，避免短文本误杀
    if (text.trim().length < 8) return false;
    return SENSITIVE_PATTERNS.some((p) => p.test(text));
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
  // 加载并注入 API 密钥到翻译引擎
  async function loadProviderCredentials(): Promise<void> {
    const { safeStorage } = require('electron');
    const keyStorePath = path.join(app.getPath('userData'), 'encrypted_keys.dat');
    const fs = require('fs');
    try {
      if (!fs.existsSync(keyStorePath)) return;
      const encrypted = fs.readFileSync(keyStorePath);
      const decrypted = safeStorage.decryptString(encrypted);
      const keys: Record<string, string> = JSON.parse(decrypted);

      const deeplProvider = translationRouter.getProvider('deepl') as any;
      if (deeplProvider?.setApiKey && keys.deeplApiKey) {
        deeplProvider.setApiKey(keys.deeplApiKey);
      }
      const youdaoProvider = translationRouter.getProvider('youdao') as any;
      if (youdaoProvider?.setCredentials && keys.youdaoAppId && keys.youdaoAppSecret) {
        youdaoProvider.setCredentials(keys.youdaoAppId, keys.youdaoAppSecret);
      }
      const baiduProvider = translationRouter.getProvider('baidu') as any;
      if (baiduProvider?.setCredentials && keys.baiduAppId && keys.baiduSecretKey) {
        baiduProvider.setCredentials(keys.baiduAppId, keys.baiduSecretKey);
      }
    } catch { /* 静默 */ }
  }

  ipcMain.handle('translation:translate', async (_event, params) => {
    await loadProviderCredentials();
    const results = await translationRouter.translateCompare(params, params.enabledProviders || ['deepl']);
    // 记录 provider 性能指标 + 遥测
    try {
      const { recordProviderMetric } = await import('../src/main/database');
      for (const r of results) {
        recordProviderMetric(r.provider, true, r.latencyMs);
        telemetry.recordTranslation({
          provider: r.provider,
          sourceLang: params.sourceLang,
          targetLang: params.targetLang,
          charCount: params.text?.length || 0,
          latencyMs: r.latencyMs,
          tmHit: false,
        });
      }
    } catch { /* 静默 */ }
    return results;
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
    <span class="pip-title">✦ DotTranslator v0.2.0</span>
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
    const api = window.electronAPI?._internal;
    let currentText = '';
    let currentLang = 'zh';

    api?.on('pip:update', (data) => {
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

  // ========== 截图 OCR（Ctrl+Shift+X） ==========
  const { desktopCapturer } = require('electron');

  ipcMain.handle('ocr:screenshot', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      // 取主屏幕截图
      const source = sources[0];
      if (!source) throw new Error('No screen source');

      const imageBase64 = source.thumbnail.toDataURL().split(',')[1];
      // 返回截图 base64，由渲染进程处理 OCR 或直接发送到翻译
      return { imageBase64, width: source.thumbnail.getSize().width, height: source.thumbnail.getSize().height };
    } catch (err: any) {
      console.error('[OCR] Screenshot failed:', err);
      throw err;
    }
  });

  // 全局快捷键 Ctrl+Shift+X 截图
  globalShortcut.register('CommandOrControl+Shift+X', () => {
    mainWindow?.webContents.send('ocr:trigger');
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

  // IPC: 公告栏 - 读取本地 .txt 文件（测试用）
  ipcMain.handle('announcement:readLocal', async (_event, filename: string) => {
    const fs = require('fs');
    const localPath = path.join(app.getPath('userData'), filename);
    try {
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath, 'utf-8');
      }
      // 也尝试读取应用根目录的文件
      const appPath = path.join(app.getAppPath(), filename);
      if (fs.existsSync(appPath)) {
        return fs.readFileSync(appPath, 'utf-8');
      }
      return '';
    } catch (err) {
      console.error('[Announcement] local read failed:', err);
      return '';
    }
  });

  // IPC: 公告栏 - 写入本地测试公告文件
  ipcMain.handle('announcement:writeLocal', async (_event, filename: string, content: string) => {
    const fs = require('fs');
    const localPath = path.join(app.getPath('userData'), filename);
    try {
      fs.writeFileSync(localPath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error('[Announcement] local write failed:', err);
      return false;
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

  // ========== 本地 HTTP API（开发者接口） ==========
  const http = require('http');
  const crypto = require('crypto');
  const localApiToken = crypto.randomBytes(16).toString('hex');
  let localApiServer: any = null;

  function startLocalApiServer(): void {
    const server = http.createServer(async (req: any, res: any) => {
      // 仅允许 127.0.0.1
      if (req.socket.remoteAddress !== '127.0.0.1' && req.socket.remoteAddress !== '::1') {
        res.writeHead(403); res.end('Forbidden'); return;
      }

      // Token 认证
      const authHeader = req.headers['authorization'];
      if (authHeader !== `Bearer ${localApiToken}`) {
        res.writeHead(401); res.end('Unauthorized'); return;
      }

      res.setHeader('Content-Type', 'application/json');

      const url = new URL(req.url, `http://localhost`);
      const pathname = url.pathname;

      try {
        if (pathname === '/api/health' && req.method === 'GET') {
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'ok', version: '0.2.0', uptime: process.uptime() }));

        } else if (pathname === '/api/languages' && req.method === 'GET') {
          const { SUPPORTED_LANGUAGES } = await import('../src/shared/constants');
          res.writeHead(200);
          res.end(JSON.stringify(SUPPORTED_LANGUAGES));

        } else if (pathname === '/api/providers' && req.method === 'GET') {
          const providers = translationRouter.getAllProviders().map((p) => ({
            id: p.id, name: p.name, requiresApiKey: p.requiresApiKey,
          }));
          res.writeHead(200);
          res.end(JSON.stringify(providers));

        } else if (pathname === '/api/translate' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          await new Promise<void>((resolve) => { req.on('end', resolve); });
          const params = JSON.parse(body);
          const results = await translationRouter.translateCompare(
            params, params.enabledProviders || ['deepl']
          );
          res.writeHead(200);
          res.end(JSON.stringify(results));

        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not Found' }));
        }
      } catch (err: any) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    // 从 18000 开始尝试绑定
    let port = 18000;
    const tryBind = () => {
      server.listen(port, '127.0.0.1', () => {
        localApiServer = server;
        console.log(`[LocalAPI] Listening on http://127.0.0.1:${port}`);
        // Token 不再打印到控制台，仅通过 IPC 安全传递给渲染进程
      });
      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && port < 18100) {
          port++;
          server.close();
          tryBind();
        }
      });
    };
    tryBind();
  }

  startLocalApiServer();

  // IPC: 获取本地 API token（仅限渲染进程安全调用）
  ipcMain.handle('local-api:token', () => {
    return localApiToken;
  });

  // IPC: 通用存储（settings 表）
  ipcMain.handle('storage:get', async (_event, key: string) => {
    const { getSetting } = await import('../src/main/database');
    return getSetting(key);
  });
  ipcMain.handle('storage:set', async (_event, key: string, value: unknown) => {
    const { setSetting } = await import('../src/main/database');
    setSetting(key, JSON.stringify(value));
  });
  ipcMain.handle('storage:delete', async (_event, key: string) => {
    const { setSetting } = await import('../src/main/database');
    setSetting(key, '');
  });

  // IPC: 翻译历史
  ipcMain.handle('history:getAll', async (_event, limit?: number) => {
    const { getHistory } = await import('../src/main/database');
    return getHistory(limit || 100);
  });
  ipcMain.handle('history:search', async (_event, query: string) => {
    const { searchHistory } = await import('../src/main/database');
    return searchHistory(query);
  });
  ipcMain.handle('history:addFavorite', async (_event, id: string) => {
    const { toggleFavorite } = await import('../src/main/database');
    toggleFavorite(id, true);
  });
  ipcMain.handle('history:removeFavorite', async (_event, id: string) => {
    const { toggleFavorite } = await import('../src/main/database');
    toggleFavorite(id, false);
  });

  // IPC: OCR 识别（需要 PaddleOCR native addon，当前返回占位）
  ipcMain.handle('ocr:recognize', async (_event, _imageBase64: string) => {
    // TODO: Phase 2 集成 PaddleOCR
    return { result: [], error: 'OCR not available - PaddleOCR native addon required' };
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
  telemetry.stop();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 关闭所有窗口时退出应用
app.on('window-all-closed', () => {
  app.quit();
});
