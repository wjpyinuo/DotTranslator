/**
 * ECharts shared theme — single source of truth for chart colors.
 * Import in any page component that renders ECharts.
 */
export const chartTheme = {
  bg: 'transparent' as const,
  tooltip: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    textStyle: { color: '#e2e8f0' },
  },
  axis: {
    label: { color: '#94a3b8' },
    line: { color: '#2a2d3a' },
    splitLine: { color: '#1e293b' },
  },
  pie: {
    label: { color: '#94a3b8', fontSize: 11 },
    borderColor: '#1a1d27',
    borderWidth: 2,
  },
  /** 语义色板 — 按用途引用，不直接用色值 */
  palette: {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    accent: '#8b5cf6',
    danger: '#ef4444',
    info: '#06b6d4',
  },
  /** ECharts series色板 — 用于饼图/多系列 */
  seriesColors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#f97316'],
} as const;
