using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Stats;

/// <summary>
/// 本地使用统计存储抽象。
/// </summary>
public interface IStatsRepository
{
    void RecordStat(LocalStatsRecord record);
    IReadOnlyList<LocalStatsRecord> GetStats(int days = 30);
}
