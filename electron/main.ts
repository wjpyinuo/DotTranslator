import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, session } from 'electron';
import path from 'path';
import { translationRouter } from '../src/workers/translation/router';
import { telemetry } from '../src/telemetry/reporter';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let floatingBall: BrowserWindow | null = null;
let miniCard: BrowserWindow | null = null;
let pipWindow: BrowserWindow | null = null;
let isQuitting = false;
let isMaximized = false;
let currentTheme = 'light';

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
  // 翻译图标：与 TitleBar / favicon 统一的 "A文" + 双向箭头设计
  // 使用 32x32 以确保各平台托盘清晰显示
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

  tray.setToolTip('DotTranslator v0.3.0 - 即时翻译');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ========== 悬浮球 48×48 常驻圆形 ==========
function createFloatingBall(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

  floatingBall.loadFile(path.join(__dirname, 'aux-windows', 'floating-ball.html'));

  // 设置圆形窗口形状（Windows/Linux 需要显式 setShape）
  floatingBall.webContents.once('did-finish-load', () => {
    // 用圆形 hit region（行级近似，确保真圆形交互区域）
    const r = 24;
    const shapes = [];
    for (let y = 0; y < 48; y++) {
      const dy = y - r;
      const halfWidth = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      if (halfWidth > 0) {
        shapes.push({ x: r - halfWidth, y, width: halfWidth * 2, height: 1 });
      }
    }
    floatingBall?.setShape(shapes);

    // 同步当前主题到悬浮球
    floatingBall?.webContents.send('theme:changed', currentTheme);
  });
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
    // 先销毁辅助窗口，确保关闭主窗口后 window-all-closed 能触发
    if (floatingBall && !floatingBall.isDestroyed()) floatingBall.destroy();
    if (pipWindow && !pipWindow.isDestroyed()) pipWindow.destroy();
    if (miniCard && !miniCard.isDestroyed()) miniCard.destroy();
    mainWindow?.close();
  });
  ipcMain.on('window:toggle-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  // 最大化状态跟踪 → 通知渲染进程更新图标
  mainWindow?.on('maximize', () => {
    isMaximized = true;
    mainWindow?.webContents.send('window:maximize-changed', true);
  });
  mainWindow?.on('unmaximize', () => {
    isMaximized = false;
    mainWindow?.webContents.send('window:maximize-changed', false);
  });
  ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // 窗口自动调整尺寸（跟随内容）
  ipcMain.on('window:resize', (_event, { width, height }: { width: number; height: number }) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const clampedW = Math.max(360, Math.min(width, 800));
    const clampedH = Math.max(400, Math.min(height, 900));
    if (!mainWindow.isMaximized()) {
      mainWindow.setSize(clampedW, clampedH);
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

  ipcMain.on('floating:close', () => {
    floatingBall?.close();
    floatingBall = null;
  });

  ipcMain.on('floating:move', (_event, x: number, y: number) => {
    if (floatingBall && !floatingBall.isDestroyed()) {
      floatingBall.setPosition(Math.round(x), Math.round(y));
    }
  });

  ipcMain.on('floating:menu', (_event, action: string) => {
    switch (action) {
      case 'toggle':
        if (mainWindow?.isVisible()) mainWindow.hide();
        else { mainWindow?.show(); mainWindow?.focus(); }
        break;
      case 'pip':
        mainWindow?.webContents.send('floating:request-last-result');
        break;
      case 'screenshot':
        mainWindow?.webContents.send('ocr:trigger');
        mainWindow?.show();
        break;
      case 'copy-last':
        mainWindow?.webContents.send('floating:request-last-result');
        break;
      case 'hide':
        floatingBall?.hide();
        break;
      case 'close':
        floatingBall?.close();
        floatingBall = null;
        break;
    }
  });

  // 主题变更广播 → 同步到所有辅助窗口
  ipcMain.on('theme:changed', (_event, theme: string) => {
    currentTheme = theme || 'light';
    floatingBall?.webContents.send('theme:changed', currentTheme);
    pipWindow?.webContents.send('theme:changed', currentTheme);
    miniCard?.webContents.send('theme:changed', currentTheme);
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  let miniCardTimer: ReturnType<typeof setTimeout> | null = null;

  function showMiniCard(text: string, sourceLang: string, targetLang: string): void {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { screen } = require('electron');
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

      miniCard.loadFile(path.join(__dirname, 'aux-windows', 'mini-card.html'));
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
        // eslint-disable-next-line @typescript-eslint/no-require-imports
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

  ipcMain.handle('clipboard:readText', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clipboard } = require('electron');
    return clipboard.readText();
  });

  // IPC: 遥测开关
  ipcMain.on('telemetry:toggle', (_event, enabled: boolean) => {
    telemetry.setEnabled(enabled);
  });

  // IPC: 翻译
  // 加载并注入 API 密钥到翻译引擎
  async function loadProviderCredentials(): Promise<void> {
    try {
      const keys = loadEncryptedKeys();

      const deeplProvider = translationRouter.getProvider('deepl') as { setApiKey?: (k: string) => void } | undefined;
      if (deeplProvider?.setApiKey && keys.deeplApiKey) {
        deeplProvider.setApiKey(keys.deeplApiKey);
      }
      const youdaoProvider = translationRouter.getProvider('youdao') as { setCredentials?: (id: string, secret: string) => void } | undefined;
      if (youdaoProvider?.setCredentials && keys.youdaoAppId && keys.youdaoAppSecret) {
        youdaoProvider.setCredentials(keys.youdaoAppId, keys.youdaoAppSecret);
      }
      const baiduProvider = translationRouter.getProvider('baidu') as { setCredentials?: (id: string, key: string) => void } | undefined;
      if (baiduProvider?.setCredentials && keys.baiduAppId && keys.baiduSecretKey) {
        baiduProvider.setCredentials(keys.baiduAppId, keys.baiduSecretKey);
      }
    } catch { /* 静默 */ }
  }

  ipcMain.handle('translation:translate', async (_event, params) => {
    await loadProviderCredentials();
    const enabled = params.enabledProviders || ['fallback'];
    const results = await translationRouter.translateCompare(params, enabled);
    // 记录 provider 性能指标 + 遥测
    try {
      const { recordProviderMetric } = await import('../src/main/database');
      const succeeded = new Set(results.map((r: any) => r.provider));
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
      // 记录失败的 provider
      for (const id of enabled) {
        if (!succeeded.has(id)) {
          recordProviderMetric(id, false, 0);
        }
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
    pipWindow.loadFile(path.join(__dirname, 'aux-windows', 'pip.html'));

    // 发送初始数据和主题
    pipWindow.webContents.once('did-finish-load', () => {
      pipWindow?.webContents.send('pip:update', data);
      pipWindow?.webContents.send('theme:changed', currentTheme);
    });
  });

  ipcMain.on('pip:hide', () => {
    pipWindow?.hide();
  });

  ipcMain.on('pip:close', () => {
    pipWindow?.close();
  });

  // ========== 截图 OCR（Ctrl+Shift+X） ==========
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    const { tmLookup } = await import('../src/main/database');
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
          res.end(JSON.stringify({ status: 'ok', version: '0.3.0', uptime: process.uptime() }));

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
            params, params.enabledProviders || ['fallback']
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
  ipcMain.handle('history:add', async (_event, entry: { sourceText: string; targetText: string; sourceLang: string; targetLang: string; provider: string; isFavorite?: boolean }) => {
    const { addHistory } = await import('../src/main/database');
    return addHistory({ ...entry, isFavorite: entry.isFavorite ?? false });
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
  ipcMain.handle('history:delete', async (_event, id: string) => {
    const { deleteHistory } = await import('../src/main/database');
    deleteHistory(id);
  });
  ipcMain.handle('history:deleteBatch', async (_event, ids: string[]) => {
    const { deleteHistoryBatch } = await import('../src/main/database');
    deleteHistoryBatch(ids);
  });
  ipcMain.handle('history:clearAll', async () => {
    const { clearAllHistory } = await import('../src/main/database');
    clearAllHistory();
  });
  ipcMain.handle('history:export', async () => {
    const { exportHistory } = await import('../src/main/database');
    return exportHistory();
  });

  // IPC: OCR 识别（Tesseract.js）
  ipcMain.handle('ocr:recognize', async (_event, imageBase64: string) => {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('chi_sim+eng');
      const buffer = Buffer.from(imageBase64, 'base64');
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      return { text: data.text.trim(), confidence: data.confidence };
    } catch (err: any) {
      console.error('[OCR] Recognition failed:', err);
      return { text: '', confidence: 0, error: err.message };
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
  telemetry.stop();
  // 清理所有辅助窗口，确保 window-all-closed 能触发
  if (floatingBall && !floatingBall.isDestroyed()) floatingBall.destroy();
  if (pipWindow && !pipWindow.isDestroyed()) pipWindow.destroy();
  if (miniCard && !miniCard.isDestroyed()) miniCard.destroy();
  if (tray && !tray.isDestroyed()) tray.destroy();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 关闭所有窗口时退出应用
app.on('window-all-closed', () => {
  app.quit();
});
