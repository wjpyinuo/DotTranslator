namespace DotTranslator.Shared.Models;

public record HistoryEntry(
    string Id,
    string SourceText,
    string TargetText,
    string SourceLang,
    string TargetLang,
    string Provider,
    bool IsFavorite,
    DateTime CreatedAt
);

public record TMEntry(
    string Id,
    string SourceLang,
    string TargetLang,
    string SourceText,
    string TargetText,
    int UsageCount,
    DateTime CreatedAt
);

public record ProviderMetricRecord(
    string Provider,
    string Date,
    int TotalCalls,
    int Success,
    int Fail,
    double AvgLatency
);

public record LocalStatsRecord(
    string Id,
    string Feature,
    string? Provider,
    string? SourceLang,
    string? TargetLang,
    int? CharCount,
    long? LatencyMs,
    bool TmHit,
    DateTime CreatedAt
);
