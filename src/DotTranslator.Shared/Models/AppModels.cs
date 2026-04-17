namespace DotTranslator.Shared.Models;

public record ProviderInfo(
    string Id,
    string Name,
    bool RequiresApiKey
);

public record LocalStats(
    int TotalTranslations,
    int TotalChars,
    double AvgLatency,
    Dictionary<string, int> ProviderDistribution,
    List<LanguagePairCount> TopLanguagePairs,
    double TmHitRate
);

public record LanguagePairCount(string Pair, int Count);

public record AppState
{
    public string Theme { get; init; } = "light";
    public bool TelemetryEnabled { get; init; }
    public bool ClipboardMonitorEnabled { get; init; } = true;
    public bool PrivacyMode { get; init; }
    public string? PreferredProvider { get; init; }
}

public record PersistedCircuit(
    string ProviderId,
    int Failures,
    string State,
    long OpenedAt,
    double ErrorRate
);
