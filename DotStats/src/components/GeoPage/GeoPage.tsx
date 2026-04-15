import { useState, useEffect, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';
import ReactECharts from 'echarts-for-react';

export function GeoPage() {
  const { serverUrl } = useStatsStore();
  const [data, setData] = useState<{ locale: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/v1/stats/geo`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (e: any) { setError(e.message || "请求失败"); }
    setLoading(false);
  }, [serverUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const localeNames: Record<string, string> = {
    'zh-CN': '简体中文', 'zh-TW': '繁體中文', 'en-US': 'English (US)', 'en-GB': 'English (UK)',
    'ja-JP': '日本語', 'ko-KR': '한국어', 'fr-FR': 'Français', 'de-DE': 'Deutsch',
    'es-ES': 'Español', 'ru-RU': 'Русский', 'pt-BR': 'Português', 'it-IT': 'Italiano',
  };

  const total = data.reduce((s, d) => s + d.count, 0);

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis' as const, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' },
      formatter: (params: any) => {
        const p = params[0];
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0;
        return `${p.name}<br/>实例: ${p.value} (${pct}%)`;
      },
    },
    grid: { left: 140, right: 40, top: 20, bottom: 30 },
    xAxis: { type: 'value' as const, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    yAxis: {
      type: 'category' as const,
      data: data.map((d) => localeNames[d.locale] || d.locale || '未知').reverse(),
      axisLabel: { color: '#e2e8f0', fontSize: 12 },
      axisLine: { lineStyle: { color: '#2a2d3a' } },
    },
    series: [{
      type: 'bar',
      data: data.map((d) => d.count).reverse(),
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: (params: any) => {
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];
          return colors[params.dataIndex % colors.length];
        },
      },
      barWidth: 16,
    }],
  };

  return (
    <div>
      <h2 className="page-title">🌍 地区分布</h2>
      {error ? (<div className="empty-chart" style={{color: "#ef4444"}}>⚠️ {error}</div>) : loading ? (
        <div className="empty-chart">加载中...</div>
      ) : data.length === 0 ? (
        <div className="empty-chart">暂无数据</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="chart-card">
            <h3>地区实例分布</h3>
            <ReactECharts option={chartOption} style={{ height: Math.max(300, data.length * 40) }} />
          </div>
          <div className="chart-card">
            <h3>地区明细</h3>
            {data.map((d) => (
              <div key={d.locale} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
                <span>{localeNames[d.locale] || d.locale || '未知'}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#3b82f6' }}>
                  {d.count} ({total > 0 ? ((d.count / total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
