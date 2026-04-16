import { useStatsStore } from '../../stores/statsStore';
import ReactECharts from 'echarts-for-react';
import { chartTheme } from '../../styles/chartTheme';

const { tooltip, axis, pie, palette, seriesColors } = chartTheme;

export function Overview() {
  const { realtimeData } = useStatsStore();

  const featureChartOption = {
    backgroundColor: chartTheme.bg,
    tooltip: { trigger: 'axis' as const, ...tooltip },
    xAxis: {
      type: 'category' as const,
      data: Object.keys(realtimeData.topFeatures),
      axisLabel: { ...axis.label, fontSize: 10 },
      axisLine: { lineStyle: { color: axis.line.color } },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: axis.label,
      splitLine: { lineStyle: { color: axis.splitLine.color } },
    },
    series: [{
      type: 'bar' as const,
      data: Object.values(realtimeData.topFeatures),
      itemStyle: { color: palette.primary, borderRadius: [4, 4, 0, 0] },
    }],
  };

  const makePieOption = (data: Record<string, number>) => ({
    backgroundColor: chartTheme.bg,
    tooltip: { trigger: 'item' as const, ...tooltip },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      label: pie,
      data: Object.entries(data).map(([name, value]) => ({ name, value })),
      itemStyle: { borderColor: pie.borderColor, borderWidth: pie.borderWidth },
      color: seriesColors,
    }],
  });

  const versionChartOption = makePieOption(realtimeData.versionDistribution);
  const osChartOption = makePieOption(realtimeData.osDistribution);

  return (
    <div className="overview">
      <h2 className="page-title">📊 总览</h2>

      <div className="metric-cards">
        <MetricCard label="在线实例" value={realtimeData.onlineNow} color={palette.primary} icon="🟢" />
        <MetricCard label="今日活跃" value={realtimeData.todayActive} color={palette.success} icon="📈" />
        <MetricCard label="本周活跃" value={realtimeData.weekActive} color={palette.warning} icon="📅" />
        <MetricCard label="最近事件" value={realtimeData.recentEvents.length} color={palette.accent} icon="⚡" />
      </div>

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
