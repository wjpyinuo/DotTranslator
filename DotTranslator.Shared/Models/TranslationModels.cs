using System.Text.Json.Serialization;

namespace DotTranslator.Shared.Models;

public record TranslateParams(
    string Text,
    string SourceLang,
    string TargetLang,
    [property: JsonIgnore] CancellationToken CancellationToken = default
);

public record TranslateResult(
    string Provider,
    string TranslatedText,
    string SourceLang,
    string TargetLang,
    long LatencyMs,
    bool FromCache = false
);

public record CompareResult(
    IReadOnlyList<TranslateResult> Results,
    IReadOnlyList<CompareError> Errors
);

public record CompareError(
    string ProviderId,
    string Error,
    ErrorCategory Category = ErrorCategory.Unknown,
    bool CircuitBroken = false
);

public enum ErrorCategory
{
    RateLimited,
    AuthFailed,
    QuotaExceeded,
    Network,
    Timeout,
    Unknown
}
