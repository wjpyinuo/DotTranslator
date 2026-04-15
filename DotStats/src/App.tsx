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

export function App() {
  const { activePage, setActivePage, serverUrl, setServerUrl, wsConnected } = useStatsStore();
  useWebSocket();

  const activeDef = PAGES.find((p) => p.id === activePage);
  const ActiveComponent = activeDef?.component || Overview;

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">📊 DotStats v0.3.0</h1>
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
  );
}
