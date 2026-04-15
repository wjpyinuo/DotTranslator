import { useStatsStore } from '../../stores/statsStore';
import ReactECharts from 'echarts-for-react';

export function Overview() {
  const { realtimeData } = useStatsStore();

  const featureChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    xAxis: {
      type: 'category',
      data: Object.keys(realtimeData.topFeatures),
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#2a2d3a' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [{
      type: 'bar',
      data: Object.values(realtimeData.topFeatures),
      itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
    }],
  };

  const versionChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { color: '#94a3b8', fontSize: 11 },
      data: Object.entries(realtimeData.versionDistribution).map(([name, value]) => ({ name, value })),
      itemStyle: { borderColor: '#1a1d27', borderWidth: 2 },
    }],
  };

  const osChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0' } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      label: { color: '#94a3b8', fontSize: 11 },
      data: Object.entries(realtimeData.osDistribution).map(([name, value]) => ({ name, value })),
      itemStyle: { borderColor: '#1a1d27', borderWidth: 2 },
    }],
  };

  return (
    <div className="overview">
      <h2 className="page-title">📊 总览</h2>

      {/* 实时指标卡片 */}
      <div className="metric-cards">
        <MetricCard label="在线实例" value={realtimeData.onlineNow} color="#3b82f6" icon="🟢" />
        <MetricCard label="今日活跃" value={realtimeData.todayActive} color="#10b981" icon="📈" />
        <MetricCard label="本周活跃" value={realtimeData.weekActive} color="#f59e0b" icon="📅" />
        <MetricCard label="最近事件" value={realtimeData.recentEvents.length} color="#8b5cf6" icon="⚡" />
      </div>

      {/* 图表区域 */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3>功能使用排行</h3>
          {Object.keys(realtimeData.topFeatures).length > 0 ? (
            <ReactECharts option={featureChartOption} style={{ height: 250 }} />
          ) : (
            <div className="empty-chart">等待数据...</div>
          )}
        </div>

        <div className="chart-card">
          <h3>版本分布</h3>
          {Object.keys(realtimeData.versionDistribution).length > 0 ? (
            <ReactECharts option={versionChartOption} style={{ height: 250 }} />
          ) : (
            <div className="empty-chart">等待数据...</div>
          )}
        </div>

        <div className="chart-card">
          <h3>系统分布</h3>
          {Object.keys(realtimeData.osDistribution).length > 0 ? (
            <ReactECharts option={osChartOption} style={{ height: 250 }} />
          ) : (
            <div className="empty-chart">等待数据...</div>
          )}
        </div>

        <div className="chart-card">
          <h3>实时事件流</h3>
          <div className="event-stream">
            {realtimeData.recentEvents.slice(0, 10).map((event, i) => (
              <div key={i} className="event-item">
                <span className="event-type">{event.type as string}</span>
                <span className="event-feature">{(event.feature as string) || '-'}</span>
                <span className="event-instance">{(event.instanceId as string)?.slice(0, 8)}</span>
              </div>
            ))}
            {realtimeData.recentEvents.length === 0 && (
              <div className="empty-chart">等待事件...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="metric-value" style={{ color }}>{value.toLocaleString()}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}
