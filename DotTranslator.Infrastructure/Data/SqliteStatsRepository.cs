using DotTranslator.Core.Stats;
using DotTranslator.Infrastructure.Data.Entities;
using DotTranslator.Shared.Models;

namespace DotTranslator.Infrastructure.Data;

/// <summary>
/// SQLite 本地使用统计存储实现。
/// </summary>
public class SqliteStatsRepository : IStatsRepository
{
    private readonly AppDbContext _db;

    public SqliteStatsRepository(AppDbContext db)
    {
        _db = db;
    }

    public void RecordStat(LocalStatsRecord record)
    {
        _db.LocalStats.Add(new LocalStatsRow
        {
            Id = record.Id,
            Feature = record.Feature,
            Provider = record.Provider,
            SourceLang = record.SourceLang,
            TargetLang = record.TargetLang,
            CharCount = record.CharCount,
            LatencyMs = record.LatencyMs,
            TmHit = record.TmHit,
            CreatedAt = new DateTimeOffset(record.CreatedAt).ToUnixTimeMilliseconds()
        });
        _db.SaveChanges();
    }

    public IReadOnlyList<LocalStatsRecord> GetStats(int days = 30)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-days).ToUnixTimeMilliseconds();
        return _db.LocalStats
            .Where(s => s.CreatedAt > since)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new LocalStatsRecord(
                s.Id, s.Feature, s.Provider, s.SourceLang, s.TargetLang,
                s.CharCount, s.LatencyMs, s.TmHit,
                DateTimeOffset.FromUnixTimeMilliseconds(s.CreatedAt).DateTime))
            .ToList();
    }
}
