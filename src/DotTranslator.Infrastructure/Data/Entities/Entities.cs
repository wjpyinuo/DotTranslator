namespace DotTranslator.Infrastructure.Data.Entities;

public class HistoryRow
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SourceText { get; set; } = string.Empty;
    public string TargetText { get; set; } = string.Empty;
    public string SourceLang { get; set; } = string.Empty;
    public string TargetLang { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty;
    public bool IsFavorite { get; set; }
    public long CreatedAt { get; set; }
}

public class TmRow
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SourceLang { get; set; } = string.Empty;
    public string TargetLang { get; set; } = string.Empty;
    public string SourceText { get; set; } = string.Empty;
    public string TargetText { get; set; } = string.Empty;
    public int UsageCount { get; set; }
    public long CreatedAt { get; set; }
}

public class SettingsRow
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class LocalStatsRow
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Feature { get; set; } = string.Empty;
    public string? Provider { get; set; }
    public string? SourceLang { get; set; }
    public string? TargetLang { get; set; }
    public int? CharCount { get; set; }
    public long? LatencyMs { get; set; }
    public bool TmHit { get; set; }
    public long CreatedAt { get; set; }
}

public class ProviderMetricRow
{
    public string Provider { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public int TotalCalls { get; set; }
    public int Success { get; set; }
    public int Fail { get; set; }
    public double TotalLatency { get; set; }
}
