using DotTranslator.Core.Stats;
using DotTranslator.Infrastructure.Data.Entities;

namespace DotTranslator.Infrastructure.Data;

/// <summary>
/// SQLite 引擎调用指标存储实现。
/// </summary>
public class SqliteMetricsRepository : IMetricsRepository
{
    private readonly AppDbContext _db;

    public SqliteMetricsRepository(AppDbContext db)
    {
        _db = db;
    }

    public void RecordProviderMetric(string provider, bool success, long latencyMs)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var existing = _db.ProviderMetrics.Find(provider, today);
        if (existing != null)
        {
            existing.TotalCalls++;
            if (success) existing.Success++; else existing.Fail++;
            existing.TotalLatency += latencyMs;
        }
        else
        {
            _db.ProviderMetrics.Add(new ProviderMetricRow
            {
                Provider = provider,
                Date = today,
                TotalCalls = 1,
                Success = success ? 1 : 0,
                Fail = success ? 0 : 1,
                TotalLatency = latencyMs
            });
        }
        _db.SaveChanges();
    }
}
