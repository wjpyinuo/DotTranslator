import { useState, useEffect, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';

interface RetentionRow {
  cohort_week: string;
  cohort_size: number;
  w1_retained: number;
  w2_retained: number;
  w4_retained: number;
  w8_retained: number;
  w12_retained: number;
}

export function RetentionPage() {
  const { serverUrl } = useStatsStore();
  const [data, setData] = useState<RetentionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/v1/stats/retention?weeks=12`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || []);
      }
    } catch (e: any) { setError(e.message || "请求失败"); }
    setLoading(false);
  }, [serverUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getColor = (rate: number) => {
    if (rate >= 50) return 'rgba(16, 185, 129, 0.4)';
    if (rate >= 30) return 'rgba(16, 185, 129, 0.25)';
    if (rate >= 15) return 'rgba(245, 158, 11, 0.25)';
    if (rate >= 5) return 'rgba(245, 158, 11, 0.15)';
    if (rate > 0) return 'rgba(239, 68, 68, 0.15)';
    return 'transparent';
  };

  const calcRate = (retained: number, cohort: number) =>
    cohort > 0 ? ((retained / cohort) * 100) : 0;

  const weeks = [
    { key: 'w1_retained', label: 'W1' },
    { key: 'w2_retained', label: 'W2' },
    { key: 'w4_retained', label: 'W4' },
    { key: 'w8_retained', label: 'W8' },
    { key: 'w12_retained', label: 'W12' },
  ] as const;

  return (
    <div>
      <h2 className="page-title">🔄 周留存分析</h2>
      {error ? (<div className="empty-chart" style={{color: "#ef4444"}}>⚠️ {error}</div>) : loading ? (
        <div className="empty-chart">加载中...</div>
      ) : data.length === 0 ? (
        <div className="empty-chart">暂无留存数据（每周一凌晨 3:00 自动计算）</div>
      ) : (
        <div className="chart-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>周次</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#94a3b8' }}>新增</th>
                {weeks.map((w) => (
                  <th key={w.key} style={{ textAlign: 'center', padding: '10px 12px', color: '#94a3b8' }}>{w.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.cohort_week} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                    {row.cohort_week}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                    {row.cohort_size}
                  </td>
                  {weeks.map((w) => {
                    const val = row[w.key] as number;
                    const rate = calcRate(val, row.cohort_size);
                    return (
                      <td key={w.key} style={{
                        textAlign: 'center', padding: '10px 12px',
                        background: getColor(rate),
                        borderRadius: 4,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        <div style={{ color: rate >= 30 ? '#10b981' : rate >= 15 ? '#f59e0b' : '#e2e8f0' }}>
                          {rate.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>({val})</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
