/**
 * IPC 处理器模块 - 注册所有渲染进程 ↔ 主进程通信
 */
import type { BrowserWindow} from 'electron';
import { ipcMain, globalShortcut, app, desktopCapturer } from 'electron';
import path from 'path';
import { translationRouter } from '../src/workers/translation/router';
import { telemetry } from '../src/telemetry/reporter';
import { getDecryptedKeys } from './secure-storage';
import {
  ValidationError,
  assertString,
  validateTranslationParams,
  validateHistoryEntry,
  validateId,
  validateIdArray,
  validateResizeParams,
  validateTheme,
  validateStorageKey,
  validateStorageValue,
  validateSearchParams,
  validateLimit,
  validateOcrBase64,
  validateFilename,
  validateContent,
  validateTmParams,
  validateTmInsertParams,
  validateLanguageDetectText,
} from './ipc-validator';

/** 公告白名单域名（防止 SSRF） */
const ANNOUNCEMENT_ALLOWED_HOSTS = new Set([
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
]);

interface WindowRefs {
  mainWindow: BrowserWindow | null;
}

interface Setters {
  setMainWindow: (win: BrowserWindow | null) => void;
  setIsQuitting: (v: boolean) => void;
  getCurrentTheme: () => string;
  setCurrentTheme: (t: string) => void;
}

export function registerAllIPC(refs: WindowRefs, setters: Setters): void {
  // 所有窗口引用通过 refs.xxx 访问（保持响应式）

  // ========== 恢复熔断器状态（跨重启保留） ==========
  import('../src/main/database').then(({ loadAllCircuitStates }) => {
    const states = loadAllCircuitStates();
    const arr = Object.entries(states).map(([providerId, s]) => ({
      providerId,
      failures: s.failures,
      state: s.state,
      openedAt: s.openedAt,
      errorRate: s.errorRate,
    }));
    translationRouter.importCircuitStates(arr);
  }).catch(() => { /* 首次启动无历史数据 */ });

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

  ipcMain.on('window:resize', (_event, raw) => {
    try {
      const { height } = validateResizeParams(raw);
      if (!refs.mainWindow || refs.mainWindow.isDestroyed()) return;
      const fixedW = 420;
      const clampedH = Math.max(400, Math.min(height, 900));
      if (!refs.mainWindow.isMaximized()) {
        refs.mainWindow.setSize(fixedW, clampedH);
      }
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:resize] Validation error:', err.message);
    }
  });

  // ========== 主题同步 ==========
  ipcMain.on('theme:changed', async (_event, raw) => {
    try {
      const theme = validateTheme(raw);
      setters.setCurrentTheme(theme);
      // 持久化到数据库
      const { setSetting } = await import('../src/main/database');
      setSetting('theme', theme);
      // 同步到遥测
      telemetry.setState({ theme });
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:theme] Validation error:', err.message);
    }
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

  ipcMain.handle('translation:translate', async (_event, raw) => {
    try {
      const params = validateTranslationParams(raw);
      await loadProviderCredentials();
      const enabled = params.enabledProviders || ['fallback'];
      const { results, errors } = await translationRouter.translateCompare(params, enabled);
      try {
        const { recordProviderMetric, saveCircuitState } = await import('../src/main/database');
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
        // 持久化熔断器状态
        for (const circuit of translationRouter.exportCircuitStates()) {
          saveCircuitState(circuit.providerId, circuit);
        }
      } catch {
        /* 静默 */
      }
      return { results, errors };
    } catch (err) {
      if (err instanceof ValidationError) {
        console.warn('[IPC:translate] Validation error:', err.message);
        throw new Error(`Invalid translation params: ${err.message}`);
      }
      throw err;
    }
  });

  ipcMain.handle('translation:getProviders', () => {
    return translationRouter.getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      requiresApiKey: p.requiresApiKey,
    }));
  });

  ipcMain.handle('translation:detectLanguage', async (_event, raw) => {
    try {
      const text = validateLanguageDetectText(raw);
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
    } catch (err) {
      if (err instanceof ValidationError) {
        console.warn('[IPC:detectLanguage] Validation error:', err.message);
        throw new Error(`Invalid params: ${err.message}`);
      }
      throw err;
    }
  });

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
  ipcMain.handle('announcement:fetch', async (_event, raw) => {
    try {
      const url = assertString(raw, 'url', { maxLen: 2048 });
      const parsed = new URL(url);
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
      const text = await res.text();
      return text.slice(0, 100_000); // 限制公告大小
    } catch (err) {
      console.error('[Announcement] fetch failed:', err);
      return '';
    }
  });

  ipcMain.handle('announcement:readLocal', async (_event, raw) => {
    try {
      const filename = validateFilename(raw);
      const fs = require('fs');
      const localPath = path.join(app.getPath('userData'), filename);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath, 'utf-8');
      }
      const appPath = path.join(app.getAppPath(), filename);
      if (fs.existsSync(appPath)) {
        return fs.readFileSync(appPath, 'utf-8');
      }
      return '';
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:readLocal] Validation error:', err.message);
      return '';
    }
  });

  ipcMain.handle('announcement:writeLocal', async (_event, rawFilename, rawContent) => {
    try {
      const filename = validateFilename(rawFilename);
      const content = validateContent(rawContent);
      const fs = require('fs');
      const localPath = path.join(app.getPath('userData'), filename);
      fs.writeFileSync(localPath, content, 'utf-8');
      return true;
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:writeLocal] Validation error:', err.message);
      else console.error('[Announcement] local write failed:', err);
      return false;
    }
  });

  // ========== TM 精确匹配 ==========
  ipcMain.handle('tm:lookup', async (_event, ...raw) => {
    try {
      const { text, sourceLang, targetLang } = validateTmParams(raw);
      const { tmLookup } = await import('../src/main/database');
      return tmLookup(sourceLang, targetLang, text);
    } catch (err) {
      if (err instanceof ValidationError) { console.warn('[IPC:tm:lookup] Validation error:', err.message); return null; }
      throw err;
    }
  });

  ipcMain.handle('tm:insert', async (_event, ...raw) => {
    try {
      const { text, targetText, sourceLang, targetLang } = validateTmInsertParams(raw);
      const { tmInsert } = await import('../src/main/database');
      tmInsert({ sourceLang, targetLang, sourceText: text, targetText, usageCount: 1 });
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:tm:insert] Validation error:', err.message);
    }
  });

  // ========== 通用存储 ==========
  ipcMain.handle('storage:get', async (_event, raw) => {
    try {
      const key = validateStorageKey(raw);
      const { getSetting } = await import('../src/main/database');
      return getSetting(key);
    } catch (err) {
      if (err instanceof ValidationError) { console.warn('[IPC:storage:get] Validation error:', err.message); return null; }
      throw err;
    }
  });

  ipcMain.handle('storage:set', async (_event, rawKey, rawValue) => {
    try {
      const key = validateStorageKey(rawKey);
      const value = validateStorageValue(rawValue);
      const { setSetting } = await import('../src/main/database');
      setSetting(key, JSON.stringify(value));
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:storage:set] Validation error:', err.message);
    }
  });

  ipcMain.handle('storage:delete', async (_event, raw) => {
    try {
      const key = validateStorageKey(raw);
      const { setSetting } = await import('../src/main/database');
      setSetting(key, '');
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:storage:delete] Validation error:', err.message);
    }
  });

  // ========== 翻译历史 ==========
  ipcMain.handle('history:getAll', async (_event, raw) => {
    try {
      const limit = validateLimit(raw);
      const { getHistory } = await import('../src/main/database');
      return getHistory(limit || 100);
    } catch (err) {
      if (err instanceof ValidationError) { console.warn('[IPC:history:getAll] Validation error:', err.message); return []; }
      throw err;
    }
  });

  ipcMain.handle('history:add', async (_event, raw) => {
    try {
      const entry = validateHistoryEntry(raw);
      const { addHistory } = await import('../src/main/database');
      return addHistory({ ...entry, isFavorite: entry.isFavorite ?? false });
    } catch (err) {
      if (err instanceof ValidationError) {
        console.warn('[IPC:history:add] Validation error:', err.message);
        throw new Error(`Invalid history entry: ${err.message}`);
      }
      throw err;
    }
  });

  ipcMain.handle('history:search', async (_event, raw) => {
    try {
      const query = validateSearchParams(raw);
      const { searchHistory } = await import('../src/main/database');
      return searchHistory(query);
    } catch (err) {
      if (err instanceof ValidationError) { console.warn('[IPC:history:search] Validation error:', err.message); return []; }
      throw err;
    }
  });

  ipcMain.handle('history:addFavorite', async (_event, raw) => {
    try {
      const id = validateId(raw);
      const { toggleFavorite } = await import('../src/main/database');
      toggleFavorite(id, true);
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:history:addFavorite] Validation error:', err.message);
    }
  });

  ipcMain.handle('history:removeFavorite', async (_event, raw) => {
    try {
      const id = validateId(raw);
      const { toggleFavorite } = await import('../src/main/database');
      toggleFavorite(id, false);
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:history:removeFavorite] Validation error:', err.message);
    }
  });

  ipcMain.handle('history:delete', async (_event, raw) => {
    try {
      const id = validateId(raw);
      const { deleteHistory } = await import('../src/main/database');
      deleteHistory(id);
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:history:delete] Validation error:', err.message);
    }
  });

  ipcMain.handle('history:deleteBatch', async (_event, raw) => {
    try {
      const ids = validateIdArray(raw);
      const { deleteHistoryBatch } = await import('../src/main/database');
      deleteHistoryBatch(ids);
    } catch (err) {
      if (err instanceof ValidationError) console.warn('[IPC:history:deleteBatch] Validation error:', err.message);
    }
  });

  ipcMain.handle('history:clearAll', async () => {
    const { clearAllHistory } = await import('../src/main/database');
    clearAllHistory();
  });

  ipcMain.handle('history:export', async () => {
    const { exportHistory } = await import('../src/main/database');
    return exportHistory();
  });

  // ========== OCR 识别（复用 worker，避免每次初始化开销）==========
  ipcMain.handle('ocr:recognize', async (_event, raw) => {
    try {
      const imageBase64 = validateOcrBase64(raw);
      const { recognize } = await import('./ocr-worker');
      return recognize(imageBase64);
    } catch (err) {
      if (err instanceof ValidationError) {
        console.warn('[IPC:ocr] Validation error:', err.message);
        throw new Error(`Invalid OCR input: ${err.message}`);
      }
      throw err;
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
