import { useState, useEffect, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';
import ReactECharts from 'echarts-for-react';
import type { CallbackDataParams } from 'echarts/types/dist/shared';

export function VersionsPage() {
  const { serverUrl } = useStatsStore();
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/v1/stats/versions`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || {});
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "请求失败"); }
    setLoading(false);
  }, [serverUrl]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' },
      formatter: (p: CallbackDataParams) => `${p.name}<br/>实例数: ${p.value} (${(p.percent ?? 0).toFixed(1)}%)`,
    },
    legend: { orient: 'vertical', right: 20, top: 'center', textStyle: { color: '#94a3b8' } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      label: { color: '#94a3b8', fontSize: 11, formatter: '{b}: {d}%' },
      data: entries.map(([name, value]) => ({ name: `v${name}`, value })),
      itemStyle: { borderColor: '#1a1d27', borderWidth: 2 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  };

  return (
    <div>
      <h2 className="page-title">📦 版本分布</h2>
      {error ? (<div className="empty-chart" style={{color: "#ef4444"}}>⚠️ {error}</div>) : loading ? (
        <div className="empty-chart">加载中...</div>
      ) : entries.length === 0 ? (
        <div className="empty-chart">暂无数据</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="chart-card">
              <h3>版本占比</h3>
              <ReactECharts option={chartOption} style={{ height: 320 }} />
            </div>
            <div className="chart-card">
              <h3>版本明细</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8' }}>版本</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#94a3b8' }}>实例数</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#94a3b8' }}>占比</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(([ver, count]) => (
                    <tr key={ver} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace' }}>v{ver}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{count}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#3b82f6' }}>
                        {total > 0 ? ((count / total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '12px', color: '#64748b', fontSize: 12, borderTop: '1px solid #2a2d3a', marginTop: 8 }}>
                合计: {total} 个实例
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
