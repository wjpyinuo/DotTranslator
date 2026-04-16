import { useState, useEffect, useRef, useCallback } from 'react';
import { TitleBar } from './components/TitleBar/TitleBar';
import { InputArea } from './components/InputArea/InputArea';
import { TranslationPanel } from './components/TranslationPanel/TranslationPanel';
import { HistoryList } from './components/HistoryList/HistoryList';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { AnnouncementBar } from './components/AnnouncementBar/AnnouncementBar';
import { AboutPanel } from './components/AboutPanel/AboutPanel';
import { useAppStore } from './stores/appStore';
import './styles/app.css';

type Tab = 'translate' | 'history' | 'about';

interface StatsData {
  totalTranslations: number;
  totalChars: number;
  avgLatency: number;
  providerDistribution: Record<string, number>;
  topLanguagePairs: { pair: string; count: number }[];
  tmHitRate: number;
}

const PROVIDER_NAMES: Record<string, string> = {
  deepl: 'DeepL',
  youdao: '有道翻译',
  baidu: '百度翻译',
};

function InlineStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const api = window.electronAPI;
        if (!api) {
          if (!cancelled) setStats({
            totalTranslations: 0, totalChars: 0, avgLatency: 0,
            providerDistribution: {}, topLanguagePairs: [], tmHitRate: 0,
          });
          return;
        }
        const data = await api.stats.get();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats({
          totalTranslations: 0, totalChars: 0, avgLatency: 0,
          providerDistribution: {}, topLanguagePairs: [], tmHitRate: 0,
        });
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  return (
    <div className="stats-inline">
      <h3 onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        {expanded ? '▾' : '▸'} 📊 使用统计
      </h3>
      {expanded && (
        <>
          <div className="stats-mini-grid">
            <div className="stat-mini-card">
              <div className="stat-mini-value">{stats.totalTranslations.toLocaleString()}</div>
              <div className="stat-mini-label">翻译次数</div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-value">{stats.totalChars.toLocaleString()}</div>
              <div className="stat-mini-label">总字数</div>
            </div>
            <div className="stat-mini-card">
              <div className="stat-mini-value">{Math.round(stats.avgLatency)}ms</div>
              <div className="stat-mini-label">平均延迟</div>
            </div>
          </div>

          {Object.keys(stats.providerDistribution).length > 0 && (
            <div className="stats-section">
              <h3 style={{ fontSize: 12, marginTop: 8 }}>引擎分布</h3>
              <div className="provider-bars">
                {Object.entries(stats.providerDistribution).map(([provider, count]) => {
                  const maxCount = Math.max(...Object.values(stats.providerDistribution), 1);
                  return (
                    <div key={provider} className="provider-bar">
                      <span className="provider-name">{PROVIDER_NAMES[provider] || provider}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                      <span className="provider-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {stats.topLanguagePairs.length > 0 && (
            <div className="stats-section">
              <h3 style={{ fontSize: 12, marginTop: 8 }}>热门语言对</h3>
              {stats.topLanguagePairs.map((item) => (
                <div key={item.pair} className="lang-pair-item">
                  <span>{item.pair}</span>
                  <span>{item.count} 次</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function App() {
  const { toggleSettings, settings, setInputText } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('translate');
  const containerRef = useRef<HTMLDivElement>(null);

  // 窗口自动调整纵向尺寸（仅在内容高度变化时调整，横向保持不变）
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastHeightRef = useRef<number>(0);
  const handleResize = useCallback(() => {
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    resizeTimerRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el || !window.electronAPI?.window?.resize) return;
      const scrollH = el.scrollHeight;
      // 仅在高度实际变化时才调整，避免无意义的 resize 抖动
      if (Math.abs(scrollH - lastHeightRef.current) < 3) return;
      lastHeightRef.current = scrollH;
      // 横向固定为初始宽度（420），只调整纵向
      const fixedWidth = 420;
      window.electronAPI.window.resize(fixedWidth, scrollH + 2);
    }, 200);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleResize]);

  // 设置持久化：从 SQLite 加载
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.storage) return;
    const keys = ['theme', 'defaultSourceLang', 'defaultTargetLang', 'enabledProviders',
      'clipboardMonitor', 'telemetryEnabled', 'privacyMode'];
    (async () => {
      for (const key of keys) {
        try {
          const val = await api.storage.get(key);
          if (val !== null && val !== undefined) {
            const parsed = typeof val === 'string' ? (() => { try { return JSON.parse(val); } catch { return val; } })() : val;
            if (parsed !== '' && parsed !== null) {
              useAppStore.getState().updateSettings({ [key]: parsed });
            }
          }
        } catch { /* 静默 */ }
      }
      // 加载后同步主题到辅助窗口
      const theme = useAppStore.getState().settings.theme;
      window.electronAPI?._internal?.send('theme:changed', theme);
    })();
  }, []);

  // 设置变更时持久化到 SQLite（防抖 500ms）
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const api = window.electronAPI;
      if (!api?.storage) return;
      const s = useAppStore.getState().settings;
      const persistKeys = ['theme', 'defaultSourceLang', 'defaultTargetLang', 'enabledProviders',
        'clipboardMonitor', 'telemetryEnabled', 'privacyMode'];
      for (const key of persistKeys) {
        try {
          api.storage.set(key, (s as unknown as Record<string, unknown>)[key]);
        } catch { /* 静默 */ }
      }
    }, 500);
  }, [settings.theme, settings.enabledProviders, settings.clipboardMonitor,
      settings.telemetryEnabled, settings.privacyMode]);

  // 剪贴板监听 → 自动填入并翻译
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.clipboard) return;

    // 同步剪贴板监听开关到主进程
    api.clipboard.setMonitor(settings.clipboardMonitor && !settings.privacyMode);

    if (!api.clipboard.onClipboardChange) return;
    api.clipboard.onClipboardChange((text: string) => {
      // 无痕模式或关闭监听 → 不处理
      if (!settings.clipboardMonitor || settings.privacyMode) return;
      if (text && text.trim()) {
        setInputText(text.trim());
      }
    });
  }, [settings.clipboardMonitor, settings.privacyMode, setInputText]);

  // 截图 OCR 快捷键监听
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.ocr?.onTrigger) return;

    api.ocr.onTrigger(async () => {
      try {
        const screenshot = await api.ocr.screenshot();
        console.log('[OCR] Screenshot captured:', screenshot.width, 'x', screenshot.height);
        // OCR 识别截图文字
        const ocrResult = await api.ocr.recognize(screenshot.imageBase64);
        if (ocrResult && typeof ocrResult === 'object' && 'text' in ocrResult && (ocrResult as { text: string }).text) {
          setInputText((ocrResult as { text: string }).text.trim());
        }
      } catch (err) {
        console.error('[OCR] Failed:', err);
      }
    });
  }, []);

  return (
    <div className={`app-container ${settings.theme}`} ref={containerRef}>
      <TitleBar />

      <nav className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
          onClick={() => setActiveTab('translate')}
        >
          🌐 翻译
        </button>
        <span className="tab-sep" />
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 历史
        </button>
        <span className="tab-sep" />
        <button
          className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          ℹ️ 关于
        </button>
        <span className="tab-sep" />
        <button className="tab-btn settings-tab" onClick={toggleSettings}>
          ⚙️ 设置
        </button>
      </nav>

      <AnnouncementBar />

      <main className="main-content">
        {activeTab === 'translate' && (
          <>
            <InputArea />
            <TranslationPanel />
            {!settings.privacyMode && <InlineStats />}
          </>
        )}
        {activeTab === 'history' && <HistoryList />}
        {activeTab === 'about' && <AboutPanel />}
      </main>

      {settings.privacyMode && (
        <div className="privacy-badge">🔒 无痕模式</div>
      )}

      <SettingsPanel />
    </div>
  );
}
