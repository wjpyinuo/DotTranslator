import { useState, useEffect, useRef, useCallback } from 'react';
import { TitleBar } from './components/TitleBar/TitleBar';
import { InputArea } from './components/InputArea/InputArea';
import { TranslationPanel } from './components/TranslationPanel/TranslationPanel';
import { HistoryList } from './components/HistoryList/HistoryList';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { AnnouncementBar } from './components/AnnouncementBar/AnnouncementBar';
import { AboutPanel } from './components/AboutPanel/AboutPanel';
import { DonatePanel } from './components/DonatePanel/DonatePanel';
import { useAppStore } from './stores/appStore';
import './styles/app.css';

type Tab = 'translate' | 'history' | 'donate' | 'settings' | 'about';

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
  const privacyMode = useAppStore((s) => s.privacyMode);

  // 实时刷新统计
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

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
    // 每 5 秒刷新一次（实时统计）
    interval = setInterval(load, 5000);
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, []);

  if (!stats || privacyMode) return null;

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
              <h3 style={{ fontSize: 13, marginTop: 8 }}>引擎分布</h3>
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
              <h3 style={{ fontSize: 13, marginTop: 8 }}>热门语言对</h3>
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
  const { settings, setInputText } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('translate');
  const containerRef = useRef<HTMLDivElement>(null);

  // 窗口自动调整纵向尺寸：内容展开/收起时调整，横向固定 420px
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastHeightRef = useRef<number>(0);
  const handleResize = useCallback(() => {
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    resizeTimerRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el || !window.electronAPI?.window?.resize) return;
      // 使用 scrollHeight 而非 offsetHeight，确保包含溢出内容
      const contentH = el.scrollHeight;
      if (Math.abs(contentH - lastHeightRef.current) < 3) return;
      lastHeightRef.current = contentH;
      // 固定横向 420，纵向按内容自适应（上下限 400~900）
      const clampedH = Math.max(400, Math.min(contentH + 4, 900));
      window.electronAPI.window.resize(420, clampedH);
    }, 80);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // ResizeObserver 监听自身尺寸变化
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    // MutationObserver 监听子树变化（DOM 增删/属性变化）
    const mutObserver = new MutationObserver(handleResize);
    mutObserver.observe(el, { childList: true, subtree: true, attributes: true });
    return () => { observer.disconnect(); mutObserver.disconnect(); };
  }, [handleResize]);

  // 内部导航事件（关于→打赏）
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('navigate-tab', handler);
    return () => window.removeEventListener('navigate-tab', handler);
  }, []);

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
      const theme = useAppStore.getState().settings.theme;
      window.electronAPI?._internal?.send('theme:changed', theme);
    })();
  }, []);

  // 设置变更时持久化
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

  // 剪贴板监听
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.clipboard) return;
    api.clipboard.setMonitor(settings.clipboardMonitor && !settings.privacyMode);
    if (!api.clipboard.onClipboardChange) return;
    api.clipboard.onClipboardChange((text: string) => {
      if (!settings.clipboardMonitor || settings.privacyMode) return;
      if (text && text.trim()) {
        setInputText(text.trim());
      }
    });
  }, [settings.clipboardMonitor, settings.privacyMode, setInputText]);

  // 截图 OCR
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.ocr?.onTrigger) return;
    api.ocr.onTrigger(async () => {
      try {
        const screenshot = await api.ocr.screenshot();
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

      {/* 主题切换快捷按钮 */}
      <div className="theme-quick-toggle">
        <button
          className={`theme-quick-btn ${settings.theme === 'light' ? 'active' : ''}`}
          onClick={() => {
            useAppStore.getState().updateSettings({ theme: 'light' });
            window.electronAPI?._internal?.send('theme:changed', 'light');
          }}
          title="亮色模式"
        >
          ☀️
        </button>
        <button
          className={`theme-quick-btn ${settings.theme === 'dark' ? 'active' : ''}`}
          onClick={() => {
            useAppStore.getState().updateSettings({ theme: 'dark' });
            window.electronAPI?._internal?.send('theme:changed', 'dark');
          }}
          title="暗色模式"
        >
          🌙
        </button>
      </div>

      <nav className="tab-bar">
        {/* 左侧：主功能 */}
        <button
          className={`tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
          onClick={() => setActiveTab('translate')}
        >
          <span className="tab-icon">🌐</span>
          <span className="tab-label">翻译</span>
        </button>
        <span className="tab-sep" />
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="tab-icon">📜</span>
          <span className="tab-label">历史</span>
        </button>
        <span className="tab-sep" />
        {/* 右侧：打赏 → 设置 → 关于 */}
        <button
          className={`tab-btn donate-tab ${activeTab === 'donate' ? 'active' : ''}`}
          onClick={() => setActiveTab('donate')}
        >
          <span className="tab-icon">☕</span>
          <span className="tab-label">打赏</span>
        </button>
        <span className="tab-sep" />
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">设置</span>
        </button>
        <span className="tab-sep" />
        <button
          className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          <span className="tab-icon">ℹ️</span>
          <span className="tab-label">关于</span>
        </button>
      </nav>

      <AnnouncementBar />

      <main className="main-content">
        {activeTab === 'translate' && (
          <>
            <InputArea />
            <TranslationPanel />
            <InlineStats />
          </>
        )}
        {activeTab === 'history' && <HistoryList />}
        {activeTab === 'donate' && <DonatePanel />}
        {activeTab === 'settings' && <SettingsPanel />}
        {activeTab === 'about' && <AboutPanel />}
      </main>

      {settings.privacyMode && (
        <div className="privacy-badge">🔒 无痕模式</div>
      )}
    </div>
  );
}
