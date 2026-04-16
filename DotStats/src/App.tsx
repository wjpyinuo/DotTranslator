import { useState, useEffect } from 'react';
import { useStatsStore } from './stores/statsStore';
import { useWebSocket } from './components/WebSocket/useWebSocket';
import { Overview } from './components/Overview/Overview';
import { TrendsPage } from './components/TrendsPage/TrendsPage';
import { FeaturesPage } from './components/FeaturesPage/FeaturesPage';
import { VersionsPage } from './components/VersionsPage/VersionsPage';
import { RetentionPage } from './components/RetentionPage/RetentionPage';
import { GeoPage } from './components/GeoPage/GeoPage';
import { ProvidersPage } from './components/ProvidersPage/ProvidersPage';
import { LiveFeedPage } from './components/LiveFeedPage/LiveFeedPage';
import { AlertsPage } from './components/AlertsPage/AlertsPage';
import { SettingsPage } from './components/SettingsPage/SettingsPage';
import './styles/dashboard.css';

interface PageDef {
  id: string;
  label: string;
  component: React.FC;
}

const PAGES: PageDef[] = [
  { id: 'overview', label: '📊 总览', component: Overview },
  { id: 'trends', label: '📈 趋势', component: TrendsPage },
  { id: 'features', label: '🎯 功能分析', component: FeaturesPage },
  { id: 'versions', label: '📦 版本', component: VersionsPage },
  { id: 'retention', label: '🔄 留存', component: RetentionPage },
  { id: 'geo', label: '🌍 地区', component: GeoPage },
  { id: 'providers', label: '🔌 引擎', component: ProvidersPage },
  { id: 'livefeed', label: '📋 实时事件', component: LiveFeedPage },
  { id: 'alerts', label: '🚨 告警', component: AlertsPage },
  { id: 'settings', label: '⚙️ 设置', component: SettingsPage },
];

function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.window) return;
    api.window.isMaximized().then(setIsMaximized);
    if (api.window.onMaximizeChanged) {
      api.window.onMaximizeChanged(setIsMaximized);
    }
  }, []);

  return (
    <div className="dotstats-titlebar">
      <div className="dotstats-titlebar-drag">
        <svg width="18" height="18" viewBox="0 0 32 32" style={{ verticalAlign: 'middle', marginRight: 6 }}>
          <defs>
            <linearGradient id="dsGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#818cf8"/>
              <stop offset="100%" stopColor="#6366f1"/>
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="30" height="30" rx="7" fill="url(#dsGrad)"/>
          <text x="7" y="14" fontSize="10" fontWeight="bold" fill="white" fontFamily="Arial,sans-serif">📊</text>
          <text x="9" y="26" fontSize="8" fontWeight="bold" fill="rgba(255,255,255,0.85)" fontFamily="Arial,sans-serif">DS</text>
        </svg>
        <span className="dotstats-titlebar-text">DotStats v0.2.1</span>
      </div>
      <div className="dotstats-titlebar-controls">
        <button onClick={() => (window as any).electronAPI?.window?.minimize()} className="dotstats-tb-btn" title="最小化">─</button>
        <button onClick={() => (window as any).electronAPI?.window?.toggleMaximize()} className="dotstats-tb-btn" title={isMaximized ? '还原' : '最大化'}>
          {isMaximized ? '⧉' : '▢'}
        </button>
        <button onClick={() => (window as any).electronAPI?.window?.close()} className="dotstats-tb-btn close" title="关闭">✕</button>
      </div>
    </div>
  );
}

export function App() {
  const { activePage, setActivePage, serverUrl, setServerUrl, wsConnected } = useStatsStore();
  useWebSocket();

  // Hash 路由：同步 activePage 与 URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1); // 去掉 #
    if (hash && PAGES.some((p) => p.id === hash)) {
      setActivePage(hash);
    }
  }, []); // 仅首次加载时读取

  useEffect(() => {
    window.location.hash = activePage;
  }, [activePage]); // activePage 变更时写入 hash

  // 监听浏览器前进/后退
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && PAGES.some((p) => p.id === hash)) {
        setActivePage(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [setActivePage]);

  const activeDef = PAGES.find((p) => p.id === activePage);
  const ActiveComponent = activeDef?.component || Overview;

  return (
    <div className="dashboard-shell">
      <TitleBar />
      <div className="dashboard">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 className="logo">📊 DotStats</h1>
            <div className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}>
              {wsConnected ? '● 已连接' : '○ 未连接'}
            </div>
          </div>

          <nav className="sidebar-nav">
            {PAGES.map((page) => (
              <button
                key={page.id}
                className={`nav-item ${activePage === page.id ? 'active' : ''}`}
                onClick={() => setActivePage(page.id)}
              >
                {page.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <input
              className="server-input"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="服务器地址"
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-panel">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
