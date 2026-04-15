import { useStatsStore } from './stores/statsStore';
import { useWebSocket } from './components/WebSocket/useWebSocket';
import { Overview } from './components/Overview/Overview';
import './styles/dashboard.css';

interface PageDef {
  id: string;
  label: string;
  ready: boolean;
}

const PAGES: PageDef[] = [
  { id: 'overview', label: '📊 总览', ready: true },
  // --- 以下页面待实现，暂不展示 ---
  // { id: 'trends', label: '📈 趋势', ready: false },
  // { id: 'features', label: '🎯 功能分析', ready: false },
  // { id: 'versions', label: '📦 版本', ready: false },
  // { id: 'retention', label: '🔄 留存', ready: false },
  // { id: 'geo', label: '🌍 地区', ready: false },
  // { id: 'providers', label: '🔌 引擎', ready: false },
  // { id: 'livefeed', label: '📋 实时事件', ready: false },
  // { id: 'alerts', label: '🚨 告警', ready: false },
  // { id: 'settings', label: '⚙️ 设置', ready: false },
];

const PLANNED_PAGES: { label: string; desc: string }[] = [
  { label: '📈 趋势', desc: '翻译量/活跃用户时序图表' },
  { label: '🎯 功能分析', desc: '各翻译引擎使用占比与性能对比' },
  { label: '📦 版本', desc: '客户端版本分布与升级率' },
  { label: '🔌 引擎', desc: 'DeepL / Google / 百度 各引擎调用量与延迟' },
  { label: '📋 实时事件', desc: 'WebSocket 实时事件流' },
  { label: '⚙️ 设置', desc: '服务器地址 / 数据保留策略 / 告警规则' },
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
            <h2>🚧 页面建设中</h2>
            <p>当前仅有「总览」页面，以下功能正在开发：</p>
            <ul className="roadmap-list">
              {PLANNED_PAGES.map((p) => (
                <li key={p.label}>
                  <strong>{p.label}</strong> — {p.desc}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
