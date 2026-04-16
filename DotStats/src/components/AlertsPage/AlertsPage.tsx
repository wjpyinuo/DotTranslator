import { useState, useEffect, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  window_hours: number;
  notify_channel: string;
  notify_target: string;
  is_enabled: boolean;
  last_triggered: string | null;
}

const METRIC_LABELS: Record<string, string> = {
  online_now: '在线实例数',
  dau: '日活跃用户',
  dau_drop_pct: 'DAU 下降百分比',
  error_rate: '错误率 (%)',
};

const OPERATOR_LABELS: Record<string, string> = {
  '>': '大于',
  '<': '小于',
  '>=': '大于等于',
  '<=': '小于等于',
  '==': '等于',
};

export function AlertsPage() {
  const { serverUrl } = useStatsStore();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<AlertRule> | null>(null);
  const [adminKey, setAdminKey] = useState(localStorage.getItem('dotstats_admin_key') || '');

  const headers = () => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey,
  });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/v1/admin/alerts`, { headers: headers() });
      if (res.ok) {
        const json = await res.json();
        setRules(json.data || []);
      } else {
        // API 可能未实现 admin/alerts 端点，从空列表开始
        setRules([]);
      }
    } catch { /* 静默 */ }
    setLoading(false);
  }, [serverUrl, adminKey]);

  useEffect(() => { void fetchRules(); }, [fetchRules]);

  const handleSave = async () => {
    if (!editing) return;
    const rule = {
      ...editing,
      id: editing.id || crypto.randomUUID(),
    };
    try {
      await fetch(`${serverUrl}/api/v1/admin/alerts`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(rule),
      });
      setEditing(null);
      void fetchRules();
    } catch { /* 静默 */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${serverUrl}/api/v1/admin/alerts/${id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      void fetchRules();
    } catch { /* 静默 */ }
  };

  const handleToggle = async (rule: AlertRule) => {
    try {
      await fetch(`${serverUrl}/api/v1/admin/alerts/${rule.id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ is_enabled: !rule.is_enabled }),
      });
      void fetchRules();
    } catch { /* 静默 */ }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="page-title" style={{ margin: 0 }}>🚨 告警规则</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            className="server-input"
            placeholder="Admin API Key"
            value={adminKey}
            onChange={(e) => { setAdminKey(e.target.value); localStorage.setItem('dotstats_admin_key', e.target.value); }}
            style={{ width: 200 }}
          />
          <button onClick={() => setEditing({
            name: '', metric: 'online_now', operator: '>', threshold: 0,
            window_hours: 24, notify_channel: 'webhook', notify_target: '', is_enabled: true,
          })} className="nav-item" style={{ width: 'auto', padding: '6px 16px' }}>
            + 新建规则
          </button>
        </div>
      </div>

      {editing && (
        <div className="chart-card" style={{ marginBottom: 16, padding: 20 }}>
          <h3 style={{ marginBottom: 12 }}>{editing.id ? '编辑规则' : '新建规则'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>规则名称</label>
              <input className="server-input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="例：DAU 下降告警" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>监控指标</label>
              <select className="server-input" value={editing.metric} onChange={(e) => setEditing({ ...editing, metric: e.target.value })}>
                {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>条件</label>
              <select className="server-input" value={editing.operator} onChange={(e) => setEditing({ ...editing, operator: e.target.value })}>
                {Object.entries(OPERATOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>阈值</label>
              <input type="number" className="server-input" value={editing.threshold || 0} onChange={(e) => setEditing({ ...editing, threshold: parseFloat(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Webhook URL</label>
              <input className="server-input" value={editing.notify_target || ''} onChange={(e) => setEditing({ ...editing, notify_target: e.target.value })} placeholder="https://..." />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button onClick={handleSave} className="nav-item" style={{ width: 'auto', padding: '6px 20px', background: '#3b82f6', color: 'white' }}>保存</button>
              <button onClick={() => setEditing(null)} className="nav-item" style={{ width: 'auto', padding: '6px 20px' }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-chart">加载中...</div>
      ) : rules.length === 0 ? (
        <div className="empty-chart">
          {adminKey ? '暂无告警规则，点击上方"新建规则"创建' : '请输入 Admin API Key 后查看告警规则'}
        </div>
      ) : (
        <div className="chart-card" style={{ padding: 0 }}>
          {rules.map((rule) => (
            <div key={rule.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderBottom: '1px solid #1e293b', opacity: rule.is_enabled ? 1 : 0.5,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{rule.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {METRIC_LABELS[rule.metric] || rule.metric} {OPERATOR_LABELS[rule.operator]} {rule.threshold}
                  {rule.last_triggered && <span style={{ marginLeft: 12, color: '#f59e0b' }}>上次触发: {new Date(rule.last_triggered).toLocaleString()}</span>}
                </div>
              </div>
              <button onClick={() => handleToggle(rule)} style={{
                padding: '4px 12px', border: '1px solid #2a2d3a', borderRadius: 6,
                background: rule.is_enabled ? 'rgba(16,185,129,0.2)' : 'transparent',
                color: rule.is_enabled ? '#10b981' : '#64748b', cursor: 'pointer', fontSize: 12,
              }}>
                {rule.is_enabled ? '启用' : '禁用'}
              </button>
              <button onClick={() => setEditing(rule)} style={{ padding: '4px 12px', border: '1px solid #2a2d3a', borderRadius: 6, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>编辑</button>
              <button onClick={() => handleDelete(rule.id)} style={{ padding: '4px 12px', border: '1px solid #2a2d3a', borderRadius: 6, background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>删除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
