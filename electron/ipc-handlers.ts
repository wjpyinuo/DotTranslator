/**
 * IPC 处理器模块 - 注册所有渲染进程 ↔ 主进程通信
 */
import { ipcMain, globalShortcut, app, BrowserWindow, desktopCapturer } from 'electron';
import path from 'path';
import { translationRouter } from '../src/workers/translation/router';
import { telemetry } from '../src/telemetry/reporter';
import { getDecryptedKeys } from './secure-storage';

interface WindowRefs {
  mainWindow: BrowserWindow | null;
  floatingBall: BrowserWindow | null;
  pipWindow: BrowserWindow | null;
  miniCard: BrowserWindow | null;
}

interface Setters {
  setMainWindow: (win: BrowserWindow | null) => void;
  setFloatingBall: (win: BrowserWindow | null) => void;
  setPipWindow: (win: BrowserWindow | null) => void;
  setMiniCard: (win: BrowserWindow | null) => void;
  setIsQuitting: (v: boolean) => void;
  getCurrentTheme: () => string;
}

export function registerAllIPC(refs: WindowRefs, setters: Setters): void {
  // 所有窗口引用通过 refs.xxx 访问（保持响应式）

  // ========== 全局快捷键 ==========
  globalShortcut.register('Alt+Space', () => {
    if (refs.mainWindow?.isVisible()) {
      refs.mainWindow.hide();
    } else {
      refs.mainWindow?.show();
      refs.mainWindow?.focus();
    }
  });

  globalShortcut.register('CommandOrControl+Shift+X', () => {
    refs.mainWindow?.webContents.send('ocr:trigger');
  });

  // ========== 窗口控制 ==========
  ipcMain.on('window:minimize', () => refs.mainWindow?.minimize());

  ipcMain.on('window:close', () => {
    setters.setIsQuitting(true);
    if (refs.floatingBall && !refs.floatingBall.isDestroyed()) refs.floatingBall.destroy();
    if (refs.pipWindow && !refs.pipWindow.isDestroyed()) refs.pipWindow.destroy();
    refs.mainWindow?.close();
  });

  ipcMain.on('window:toggle-maximize', () => {
    if (refs.mainWindow?.isMaximized()) {
      refs.mainWindow.unmaximize();
    } else {
      refs.mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:is-maximized', () => {
    return refs.mainWindow?.isMaximized() ?? false;
  });

  ipcMain.on('window:resize', (_event, { width, height }: { width: number; height: number }) => {
    if (!refs.mainWindow || refs.mainWindow.isDestroyed()) return;
    const clampedW = Math.max(360, Math.min(width, 800));
    const clampedH = Math.max(400, Math.min(height, 900));
    if (!refs.mainWindow.isMaximized()) {
      refs.mainWindow.setSize(clampedW, clampedH);
    }
  });

  // ========== 悬浮球事件 ==========
  ipcMain.on('floating:click', () => {
    if (refs.mainWindow?.isVisible()) {
      refs.mainWindow.hide();
    } else {
      refs.mainWindow?.show();
      refs.mainWindow?.focus();
    }
  });

  ipcMain.on('floating:double-click', () => {
    refs.mainWindow?.webContents.send('floating:request-last-result');
  });

  ipcMain.on('floating:update', (_event, text: string) => {
    refs.floatingBall?.webContents.send('floating:update-icon', text ? text.slice(0, 1) : '✦');
  });

  ipcMain.on('floating:hide', () => refs.floatingBall?.hide());
  ipcMain.on('floating:show', () => refs.floatingBall?.show());

  ipcMain.on('floating:close', () => {
    refs.floatingBall?.close();
    refs.floatingBall = null;
  });

  ipcMain.on('floating:move', (_event, x: number, y: number) => {
    if (refs.floatingBall && !refs.floatingBall.isDestroyed()) {
      refs.floatingBall.setPosition(Math.round(x), Math.round(y));
    }
  });

  ipcMain.on('floating:menu', (_event, action: string) => {
    switch (action) {
      case 'toggle':
        if (refs.mainWindow?.isVisible()) refs.mainWindow.hide();
        else {
          refs.mainWindow?.show();
          refs.mainWindow?.focus();
        }
        break;
      case 'pip':
        refs.mainWindow?.webContents.send('floating:request-last-result');
        break;
      case 'screenshot':
        refs.mainWindow?.webContents.send('ocr:trigger');
        refs.mainWindow?.show();
        break;
      case 'copy-last':
        refs.mainWindow?.webContents.send('floating:request-last-result');
        break;
      case 'hide':
        refs.floatingBall?.hide();
        break;
      case 'close':
        refs.floatingBall?.close();
        refs.floatingBall = null;
        break;
    }
  });

  // ========== 主题同步 ==========
  ipcMain.on('theme:changed', (_event, theme: string) => {
    const currentTheme = theme || 'light';
    refs.floatingBall?.webContents.send('theme:changed', currentTheme);
    refs.pipWindow?.webContents.send('theme:changed', currentTheme);
  });

  // ========== 应用退出 ==========
  ipcMain.on('app:quit', () => {
    setters.setIsQuitting(true);
    app.quit();
  });

  // ========== 遥测开关 ==========
  ipcMain.on('telemetry:toggle', (_event, enabled: boolean) => {
    telemetry.setEnabled(enabled);
  });

  // ========== 翻译 ==========
  async function loadProviderCredentials(): Promise<void> {
    try {
      const keys = getDecryptedKeys();

      const deeplProvider = translationRouter.getProvider('deepl') as {
        setApiKey?: (k: string) => void;
      } | undefined;
      if (deeplProvider?.setApiKey && keys.deeplApiKey) {
        deeplProvider.setApiKey(keys.deeplApiKey);
      }
      const youdaoProvider = translationRouter.getProvider('youdao') as {
        setCredentials?: (id: string, secret: string) => void;
      } | undefined;
      if (youdaoProvider?.setCredentials && keys.youdaoAppId && keys.youdaoAppSecret) {
        youdaoProvider.setCredentials(keys.youdaoAppId, keys.youdaoAppSecret);
      }
      const baiduProvider = translationRouter.getProvider('baidu') as {
        setCredentials?: (id: string, key: string) => void;
      } | undefined;
      if (baiduProvider?.setCredentials && keys.baiduAppId && keys.baiduSecretKey) {
        baiduProvider.setCredentials(keys.baiduAppId, keys.baiduSecretKey);
      }
    } catch {
      /* 静默 */
    }
  }

  ipcMain.handle('translation:translate', async (_event, params) => {
    await loadProviderCredentials();
    const enabled = params.enabledProviders || ['fallback'];
    const results = await translationRouter.translateCompare(params, enabled);
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
      for (const id of enabled) {
        if (!succeeded.has(id)) {
          recordProviderMetric(id, false, 0);
        }
      }
    } catch {
      /* 静默 */
    }
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
      } catch {
        /* try next */
      }
    }
    throw new Error('No available provider for language detection');
  });

  // ========== PiP 窗口 ==========
  ipcMain.on('pip:show', (_event, data: { text: string; sourceLang: string; targetLang: string }) => {
    if (refs.pipWindow && !refs.pipWindow.isDestroyed()) {
      refs.pipWindow.show();
      refs.pipWindow.focus();
      refs.pipWindow.webContents.send('pip:update', data);
      return;
    }

    const mainBounds = refs.mainWindow?.getBounds();
    const pipX = mainBounds ? mainBounds.x + mainBounds.width + 10 : 100;
    const pipY = mainBounds ? mainBounds.y : 100;

    const pip = new BrowserWindow({
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

    pip.on('closed', () => {
      refs.pipWindow = null;
    });

    pip.loadFile(path.join(__dirname, 'aux-windows', 'pip.html'));

    pip.webContents.once('did-finish-load', () => {
      pip.webContents.send('pip:update', data);
      pip.webContents.send('theme:changed', setters.getCurrentTheme());
    });

    refs.pipWindow = pip;
  });

  ipcMain.on('pip:hide', () => refs.pipWindow?.hide());
  ipcMain.on('pip:close', () => refs.pipWindow?.close());

  // ========== 截图 OCR ==========
  ipcMain.handle('ocr:screenshot', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      const source = sources[0];
      if (!source) throw new Error('No screen source');

      const imageBase64 = source.thumbnail.toDataURL().split(',')[1];
      return {
        imageBase64,
        width: source.thumbnail.getSize().width,
        height: source.thumbnail.getSize().height,
      };
    } catch (err: any) {
      console.error('[OCR] Screenshot failed:', err);
      throw err;
    }
  });

  // ========== 公告栏 ==========
  // 公告白名单域名（防止 SSRF）
  const ANNOUNCEMENT_ALLOWED_HOSTS = new Set([
    'raw.githubusercontent.com',
    'gist.githubusercontent.com',
    'cdn.jsdelivr.net',
    'unpkg.com',
  ]);

  ipcMain.handle('announcement:fetch', async (_event, url: string) => {
    try {
      const parsed = new URL(url);
      // 仅允许 HTTPS + 白名单域名
      if (parsed.protocol !== 'https:') {
        console.warn('[Announcement] Blocked non-HTTPS URL:', url);
        return '';
      }
      if (!ANNOUNCEMENT_ALLOWED_HOSTS.has(parsed.hostname)) {
        console.warn('[Announcement] Blocked non-whitelisted host:', parsed.hostname);
        return '';
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.error('[Announcement] fetch failed:', err);
      return '';
    }
  });

  ipcMain.handle('announcement:readLocal', async (_event, filename: string) => {
    const fs = require('fs');
    const localPath = path.join(app.getPath('userData'), filename);
    try {
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath, 'utf-8');
      }
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

  // ========== TM 精确匹配 ==========
  ipcMain.handle('tm:lookup', async (_event, text: string, sourceLang: string, targetLang: string) => {
    const { tmLookup } = await import('../src/main/database');
    return tmLookup(sourceLang, targetLang, text);
  });

  ipcMain.handle(
    'tm:insert',
    async (_event, text: string, targetText: string, sourceLang: string, targetLang: string) => {
      const { tmInsert } = await import('../src/main/database');
      tmInsert({ sourceLang, targetLang, sourceText: text, targetText, usageCount: 1 });
    }
  );

  // ========== 通用存储 ==========
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

  // ========== 翻译历史 ==========
  ipcMain.handle('history:getAll', async (_event, limit?: number) => {
    const { getHistory } = await import('../src/main/database');
    return getHistory(limit || 100);
  });

  ipcMain.handle(
    'history:add',
    async (
      _event,
      entry: {
        sourceText: string;
        targetText: string;
        sourceLang: string;
        targetLang: string;
        provider: string;
        isFavorite?: boolean;
      }
    ) => {
      const { addHistory } = await import('../src/main/database');
      return addHistory({ ...entry, isFavorite: entry.isFavorite ?? false });
    }
  );

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

  // ========== OCR 识别 ==========
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

  // ========== 本地统计 ==========
  ipcMain.handle('stats:get', async () => {
    const { getLocalStats, getHistory } = await import('../src/main/database');
    const stats = getLocalStats(30);
    const history = getHistory(1000);

    const totalTranslations = stats.length;
    const totalChars = stats.reduce((sum, s) => sum + (s.charCount || 0), 0);
    const avgLatency =
      stats.length > 0
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
}
