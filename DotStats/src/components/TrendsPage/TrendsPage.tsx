import { useState, useEffect, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';
import ReactECharts from 'echarts-for-react';

type Granularity = 'day' | 'week' | 'month';

export function TrendsPage() {
  const { serverUrl } = useStatsStore();
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [period, setPeriod] = useState('30');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const to = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - parseInt(period) * 86400000).toISOString().split('T')[0];
      const res = await fetch(
        `${serverUrl}/api/v1/stats/trend?from=${from}&to=${to}&granularity=${granularity}&metrics=dau,new_instances,heartbeats,feature_calls`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (e: any) { setError(e.message || "请求失败"); }
    setLoading(false);
  }, [serverUrl, granularity, period]);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  const dates = data.map((d: any) => {
    const p = d.period;
    return typeof p === 'string' && p.length > 10 ? p.slice(0, 10) : p;
  });

  const makeOption = (title: string, key: string, color: string) => ({
    backgroundColor: 'transparent',
    title: { text: title, textStyle: { color: '#e2e8f0', fontSize: 14 }, left: 10 },
    tooltip: { trigger: 'axis' as const, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category' as const, data: dates, axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { lineStyle: { color: '#2a2d3a' } } },
    yAxis: { type: 'value' as const, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    series: [{
      type: 'line', smooth: true, data: data.map((d: any) => d[key] || 0),
      lineStyle: { color, width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '40' }, { offset: 1, color: color + '05' }] } },
      itemStyle: { color },
    }],
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="page-title" style={{ margin: 0 }}>📈 趋势分析</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="server-input" style={{ width: 120 }}>
            <option value="7">最近 7 天</option>
            <option value="30">最近 30 天</option>
            <option value="90">最近 90 天</option>
          </select>
          <select value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)} className="server-input" style={{ width: 100 }}>
            <option value="day">按天</option>
            <option value="week">按周</option>
            <option value="month">按月</option>
          </select>
          <button onClick={fetchTrends} className="nav-item" style={{ width: 'auto', padding: '6px 16px' }}>刷新</button>
        </div>
      </div>

      {error ? (<div className="empty-chart" style={{color: "#ef4444"}}>⚠️ {error}</div>) : loading ? (
        <div className="empty-chart">加载中...</div>
      ) : data.length === 0 ? (
        <div className="empty-chart">暂无数据，等待客户端上报</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="chart-card"><ReactECharts option={makeOption('日活跃用户 (DAU)', 'dau', '#3b82f6')} style={{ height: 260 }} /></div>
          <div className="chart-card"><ReactECharts option={makeOption('新实例数', 'new_instances', '#10b981')} style={{ height: 260 }} /></div>
          <div className="chart-card"><ReactECharts option={makeOption('心跳数', 'heartbeats', '#f59e0b')} style={{ height: 260 }} /></div>
          <div className="chart-card"><ReactECharts option={makeOption('功能调用量', 'feature_calls', '#8b5cf6')} style={{ height: 260 }} /></div>
        </div>
      )}
    </div>
  );
}
