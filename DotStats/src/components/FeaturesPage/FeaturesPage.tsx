import { useState, useEffect, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';
import ReactECharts from 'echarts-for-react';

export function FeaturesPage() {
  const { serverUrl } = useStatsStore();
  const [data, setData] = useState<any[]>([]);
  const [sort, setSort] = useState<string>('total');
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/v1/stats/features?period=${period}d&sort=${sort}&limit=20`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (e: any) { setError(e.message || "请求失败"); }
    setLoading(false);
  }, [serverUrl, sort, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const featureNames: Record<string, string> = {
    translate_manual: '手动翻译',
    translate_clipboard: '剪贴板翻译',
    translate_ocr: '截图 OCR',
    comparison_view: '对比视图',
    pip_window: '悬浮球',
    tts_play: '语音朗读',
    api_called: 'API 调用',
    theme_switch: '主题切换',
    privacy_mode_on: '隐私模式',
    glossary_import: '术语库导入',
    tm_import: 'TM 导入',
    tm_match_hit: 'TM 匹配命中',
    error_occurred: '错误事件',
  };

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' as const, backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    grid: { left: 140, right: 60, top: 20, bottom: 30 },
    xAxis: { type: 'value' as const, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#1e293b' } } },
    yAxis: {
      type: 'category' as const,
      data: data.map((d: any) => featureNames[d.feature] || d.feature).reverse(),
      axisLabel: { color: '#e2e8f0', fontSize: 12 },
      axisLine: { lineStyle: { color: '#2a2d3a' } },
    },
    series: [
      {
        name: '总调用',
        type: 'bar' as const,
        data: data.map((d: any) => parseInt(d.total_calls)).reverse(),
        itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] },
        barWidth: 14,
      },
      {
        name: '独立用户',
        type: 'bar' as const,
        data: data.map((d: any) => parseInt(d.unique_users)).reverse(),
        itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] },
        barWidth: 14,
      },
    ],
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="page-title" style={{ margin: 0 }}>🎯 功能分析</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="server-input" style={{ width: 120 }}>
            <option value="7">最近 7 天</option>
            <option value="30">最近 30 天</option>
            <option value="90">最近 90 天</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="server-input" style={{ width: 120 }}>
            <option value="total">按调用量</option>
            <option value="users">按用户数</option>
          </select>
        </div>
      </div>

      {error ? (<div className="empty-chart" style={{color: "#ef4444"}}>⚠️ {error}</div>) : loading ? (
        <div className="empty-chart">加载中...</div>
      ) : data.length === 0 ? (
        <div className="empty-chart">暂无数据</div>
      ) : (
        <div className="chart-card" style={{ padding: 20 }}>
          <ReactECharts option={chartOption} style={{ height: Math.max(300, data.length * 40) }} />
        </div>
      )}
    </div>
  );
}
