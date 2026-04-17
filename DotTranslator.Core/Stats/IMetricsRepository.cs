namespace DotTranslator.Core.Stats;

/// <summary>
/// 引擎调用指标存储抽象。
/// </summary>
public interface IMetricsRepository
{
    void RecordProviderMetric(string provider, bool success, long latencyMs);
}
