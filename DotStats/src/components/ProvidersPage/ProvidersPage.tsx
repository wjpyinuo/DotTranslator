import { useState, useEffect, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';
import ReactECharts from 'echarts-for-react';

interface ProviderMetric {
  provider: string;
  date: string;
  total_calls: number;
  success: number;
  fail: number;
  avg_latency: number;
}

export function ProvidersPage() {
  const { serverUrl } = useStatsStore();
  const [distribution, setDistribution] = useState<{ provider: string; count: number }[]>([]);
  const [metrics, setMetrics] = useState<ProviderMetric[]>([]);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [distRes, metricRes] = await Promise.all([
        fetch(`${serverUrl}/api/v1/stats/providers`),
        fetch(`${serverUrl}/api/v1/stats/providers/metrics?period=${period}d`),
      ]);
      if (distRes.ok) {
        const json = await distRes.json();
        setDistribution(json.data || []);
      }
      if (metricRes.ok) {
        const json = await metricRes.json();
        setMetrics(json.data || []);
      }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "请求失败"); }
    setLoading(false);
  }, [serverUrl, period]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const providerNames: Record<string, string> = { deepl: 'DeepL', youdao: '有道翻译', baidu: '百度翻译' };
  const providerColors: Record<string, string> = { deepl: '#10b981', youdao: '#3b82f6', baidu: '#f59e0b' };

  // 聚合 metrics by provider
  const byProvider: Record<string, ProviderMetric[]> = {};
  for (const m of metrics) {
    if (!byProvider[m.provider]) byProvider[m.provider] = [];
    byProvider[m.provider].push(m);
  }

  // 饼图
  const pieOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' as const, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      label: { color: '#94a3b8', fontSize: 11 },
      data: distribution.map((d) => ({
        name: providerNames[d.provider] || d.provider,
        value: d.count,
        itemStyle: { color: providerColors[d.provider] || '#64748b' },
      })),
      itemStyle: { borderColor: '#1a1d27', borderWidth: 2 },
    }],
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="page-title" style={{ margin: 0 }}>🔌 翻译引擎</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="server-input" style={{ width: 120 }}>
          <option value="7">最近 7 天</option>
          <option value="30">最近 30 天</option>
          <option value="90">最近 90 天</option>
        </select>
      </div>

      {error ? (<div className="empty-chart" style={{color: "#ef4444"}}>⚠️ {error}</div>) : loading ? (
        <div className="empty-chart">加载中...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="chart-card">
            <h3>引擎调用分布</h3>
            {distribution.length > 0 ? (
              <ReactECharts option={pieOption} style={{ height: 280 }} />
            ) : (
              <div className="empty-chart">暂无数据</div>
            )}
          </div>

          <div className="chart-card">
            <h3>引擎性能摘要</h3>
            {Object.entries(byProvider).map(([provider, items]) => {
              const totalCalls = items.reduce((s, i) => s + i.total_calls, 0);
              const totalSuccess = items.reduce((s, i) => s + i.success, 0);
              const avgLatency = items.reduce((s, i) => s + i.avg_latency, 0) / (items.length || 1);
              const successRate = totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 0;
              return (
                <div key={provider} style={{ marginBottom: 16, padding: '12px', background: '#0f1117', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: providerColors[provider] || '#e2e8f0' }}>
                      {providerNames[provider] || provider}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{items.length} 天数据</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ color: '#64748b' }}>总调用</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: '#e2e8f0' }}>{totalCalls}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b' }}>成功率</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: successRate >= 95 ? '#10b981' : '#f59e0b' }}>
                        {successRate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b' }}>平均延迟</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: '#e2e8f0' }}>{Math.round(avgLatency)}ms</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {Object.keys(byProvider).length === 0 && <div className="empty-chart">暂无引擎性能数据</div>}
          </div>
        </div>
      )}
    </div>
  );
}
