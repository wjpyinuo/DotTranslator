import { useState } from 'react';
import { useStatsStore } from '../../stores/statsStore';

export function LiveFeedPage() {
  const { realtimeData, wsConnected } = useStatsStore();
  const [paused, setPaused] = useState(false);
  const [maxItems, setMaxItems] = useState(50);

  const events = paused ? [] : realtimeData.recentEvents;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="page-title" style={{ margin: 0 }}>📋 实时事件流</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 12,
            background: wsConnected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            color: wsConnected ? '#10b981' : '#ef4444',
          }}>
            {wsConnected ? '● WebSocket 已连接' : '○ 未连接'}
          </span>
          <button
            onClick={() => setPaused(!paused)}
            className="nav-item"
            style={{ width: 'auto', padding: '6px 16px' }}
          >
            {paused ? '▶ 恢复' : '⏸ 暂停'}
          </button>
          <select value={maxItems} onChange={(e) => setMaxItems(parseInt(e.target.value))} className="server-input" style={{ width: 80 }}>
            <option value={20}>20 条</option>
            <option value={50}>50 条</option>
            <option value={100}>100 条</option>
          </select>
        </div>
      </div>

      <div className="chart-card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2d3a', display: 'flex', gap: 20, fontSize: 12, color: '#94a3b8' }}>
          <span style={{ width: 80 }}>类型</span>
          <span style={{ flex: 1 }}>功能</span>
          <span style={{ width: 100, textAlign: 'right' }}>实例 ID</span>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
          {events.length === 0 ? (
            <div className="empty-chart">{paused ? '已暂停接收事件' : '等待事件...'}</div>
          ) : (
            events.slice(0, maxItems).map((event: any, i: number) => (
              <div key={i} style={{
                display: 'flex', gap: 20, padding: '10px 16px',
                borderBottom: '1px solid #1e293b', fontSize: 12,
                background: i === 0 ? 'rgba(59,130,246,0.05)' : 'transparent',
                animation: i === 0 ? 'fadeIn 0.3s ease' : undefined,
              }}>
                <span style={{
                  padding: '2px 10px', borderRadius: 10, fontWeight: 600, fontSize: 10,
                  background: event.type === 'heartbeat' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                  color: event.type === 'heartbeat' ? '#10b981' : '#3b82f6',
                  minWidth: 70, textAlign: 'center',
                }}>
                  {event.type}
                </span>
                <span style={{ flex: 1, color: '#e2e8f0' }}>{event.feature || '-'}</span>
                <span style={{ width: 100, textAlign: 'right', color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                  {event.instanceId?.slice(0, 8) || '-'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
