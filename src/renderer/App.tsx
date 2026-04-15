import { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar/TitleBar';
import { InputArea } from './components/InputArea/InputArea';
import { TranslationPanel } from './components/TranslationPanel/TranslationPanel';
import { HistoryList } from './components/HistoryList/HistoryList';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { AnnouncementBar } from './components/AnnouncementBar/AnnouncementBar';
import { useAppStore } from './stores/appStore';
import './styles/app.css';

type Tab = 'translate' | 'history';

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
  google: 'Google',
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
  const { toggleSettings, settings } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('translate');

  return (
    <div className={`app-container ${settings.theme}`}>
      <TitleBar />

      <nav className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
          onClick={() => setActiveTab('translate')}
        >
          🌐 翻译
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 历史
        </button>
        <button className="tab-btn settings-tab" onClick={toggleSettings}>
          ⚙️
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
      </main>

      {settings.privacyMode && (
        <div className="privacy-badge">🔒 无痕模式</div>
      )}

      <SettingsPanel />
    </div>
  );
}
