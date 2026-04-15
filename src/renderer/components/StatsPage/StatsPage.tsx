import { useEffect, useState } from 'react';

interface StatsData {
  totalTranslations: number;
  totalChars: number;
  avgLatency: number;
  providerDistribution: Record<string, number>;
  topLanguagePairs: { pair: string; count: number }[];
  tmHitRate: number;
}

export function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    // TODO: 从 IPC 获取统计数据
    setStats({
      totalTranslations: 0,
      totalChars: 0,
      avgLatency: 0,
      providerDistribution: {},
      topLanguagePairs: [],
      tmHitRate: 0,
    });
  }, []);

  if (!stats) return <div className="loading">加载中...</div>;

  return (
    <div className="stats-page">
      <h2>📊 我的统计</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalTranslations.toLocaleString()}</div>
          <div className="stat-label">翻译次数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalChars.toLocaleString()}</div>
          <div className="stat-label">总字数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(stats.avgLatency)}ms</div>
          <div className="stat-label">平均延迟</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{(stats.tmHitRate * 100).toFixed(1)}%</div>
          <div className="stat-label">TM 命中率</div>
        </div>
      </div>

      <div className="stats-section">
        <h3>引擎使用分布</h3>
        <div className="provider-bars">
          {Object.entries(stats.providerDistribution).map(([provider, count]) => (
            <div key={provider} className="provider-bar">
              <span className="provider-name">{provider}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(count / Math.max(...Object.values(stats.providerDistribution))) * 100}%`,
                  }}
                />
              </div>
              <span className="provider-count">{count}</span>
            </div>
          ))}
          {Object.keys(stats.providerDistribution).length === 0 && (
            <div className="empty-hint">开始翻译后这里会显示数据</div>
          )}
        </div>
      </div>

      <div className="stats-section">
        <h3>热门语言对</h3>
        <div className="lang-pair-list">
          {stats.topLanguagePairs.map((item) => (
            <div key={item.pair} className="lang-pair-item">
              <span>{item.pair}</span>
              <span>{item.count} 次</span>
            </div>
          ))}
          {stats.topLanguagePairs.length === 0 && (
            <div className="empty-hint">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
