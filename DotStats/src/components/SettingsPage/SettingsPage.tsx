import { useState, useEffect, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';

export function SettingsPage() {
  const { serverUrl, setServerUrl } = useStatsStore();
  const [health, setHealth] = useState<any>(null);
  const [adminKey, setAdminKey] = useState(localStorage.getItem('dotstats_admin_key') || '');
  const [wsToken, setWsToken] = useState(localStorage.getItem('dotstats_ws_token') || '');
  const [exportFormat, setExportFormat] = useState('json');
  const [exportDays, setExportDays] = useState('30');
  const [exporting, setExporting] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${serverUrl}/api/v1/health`);
      if (res.ok) setHealth(await res.json());
      else setHealth({ status: 'error', checks: { http: `HTTP ${res.status}` } });
    } catch (e: any) {
      setHealth({ status: 'error', checks: { connection: e.message || '连接失败' } });
    }
  }, [serverUrl]);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - parseInt(exportDays) * 86400000).toISOString().split('T')[0];
      const res = await fetch(
        `${serverUrl}/api/v1/admin/export?format=${exportFormat}&from=${from}&to=${to}`,
        { headers: { 'x-admin-key': adminKey } }
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dotstats-export.${exportFormat}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* 静默 */ }
    setExporting(false);
  };

  const handleDeleteInstance = async () => {
    const id = prompt('输入要删除的实例 ID:');
    if (!id) return;
    if (!confirm(`确定删除实例 ${id} 及其所有数据？此操作不可恢复。`)) return;
    try {
      await fetch(`${serverUrl}/api/v1/instances/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      alert('删除成功');
    } catch { alert('删除失败'); }
  };

  return (
    <div>
      <h2 className="page-title">⚙️ 设置</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 服务器连接 */}
        <div className="chart-card">
          <h3>🔗 服务器连接</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>服务器地址</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="server-input" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} style={{ flex: 1 }} />
              <button onClick={checkHealth} className="nav-item" style={{ width: 'auto', padding: '6px 16px' }}>检查</button>
            </div>
          </div>

          {health && (
            <div style={{ padding: 12, background: '#0f1117', borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: health.status === 'healthy' ? '#10b981' : '#ef4444',
                }} />
                <span style={{ fontWeight: 600, color: health.status === 'healthy' ? '#10b981' : '#ef4444' }}>
                  {health.status === 'healthy' ? '健康' : '异常'}
                </span>
              </div>
              {health.checks && Object.entries(health.checks).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                  <span style={{ color: '#94a3b8' }}>{k}</span>
                  <span style={{ color: v === 'ok' ? '#10b981' : '#ef4444' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 认证配置 */}
        <div className="chart-card">
          <h3>🔐 认证配置</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Admin API Key</label>
            <input type="password" className="server-input" value={adminKey}
              onChange={(e) => { setAdminKey(e.target.value); localStorage.setItem('dotstats_admin_key', e.target.value); }}
              placeholder="用于管理操作（删除实例/导出数据）" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>WebSocket Token</label>
            <input type="password" className="server-input" value={wsToken}
              onChange={(e) => { setWsToken(e.target.value); localStorage.setItem('dotstats_ws_token', e.target.value); }}
              placeholder="用于 WebSocket 连接认证" />
          </div>
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>密钥仅存储在本地浏览器 localStorage 中</p>
        </div>

        {/* 数据导出 */}
        <div className="chart-card">
          <h3>📤 数据导出</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>格式</label>
              <select className="server-input" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>范围</label>
              <select className="server-input" value={exportDays} onChange={(e) => setExportDays(e.target.value)}>
                <option value="7">最近 7 天</option>
                <option value="30">最近 30 天</option>
                <option value="90">最近 90 天</option>
              </select>
            </div>
          </div>
          <button onClick={handleExport} disabled={exporting} className="nav-item"
            style={{ width: '100%', padding: '8px', background: '#3b82f6', color: 'white', opacity: exporting ? 0.6 : 1 }}>
            {exporting ? '导出中...' : '📥 导出数据'}
          </button>
        </div>

        {/* 实例管理 */}
        <div className="chart-card">
          <h3>🗑️ 实例管理</h3>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
            GDPR 合规：删除实例将级联删除该实例的所有事件数据。
          </p>
          <button onClick={handleDeleteInstance} className="nav-item"
            style={{ width: '100%', padding: '8px', border: '1px solid #ef4444', color: '#ef4444' }}>
            删除指定实例
          </button>
        </div>
      </div>
    </div>
  );
}
