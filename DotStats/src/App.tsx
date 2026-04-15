import { useStatsStore } from './stores/statsStore';
import { useWebSocket } from './components/WebSocket/useWebSocket';
import { Overview } from './components/Overview/Overview';
import './styles/dashboard.css';

const PAGES = [
  { id: 'overview', label: '🔴 总览', icon: '' },
  { id: 'trends', label: '📈 趋势', icon: '' },
  { id: 'features', label: '🎯 功能分析', icon: '' },
  { id: 'versions', label: '📦 版本', icon: '' },
  { id: 'retention', label: '🔄 留存', icon: '' },
  { id: 'geo', label: '🌍 地区', icon: '' },
  { id: 'providers', label: '🔌 引擎', icon: '' },
  { id: 'livefeed', label: '📋 实时事件', icon: '' },
  { id: 'alerts', label: '🚨 告警', icon: '' },
  { id: 'settings', label: '⚙️ 设置', icon: '' },
];

export function App() {
  const { activePage, setActivePage, serverUrl, setServerUrl, wsConnected } = useStatsStore();
  useWebSocket();

  return (
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
        {activePage === 'overview' && <Overview />}
        {activePage !== 'overview' && (
          <div className="placeholder-page">
            <h2>{PAGES.find((p) => p.id === activePage)?.label}</h2>
            <p>功能开发中...</p>
          </div>
        )}
      </main>
    </div>
  );
}
