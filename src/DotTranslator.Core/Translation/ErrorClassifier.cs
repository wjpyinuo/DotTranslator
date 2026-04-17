using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation;

public static class ErrorClassifier
{
    private static readonly HashSet<ErrorCategory> NoCircuitTrip = new()
    {
        ErrorCategory.RateLimited,
        ErrorCategory.QuotaExceeded,
        ErrorCategory.AuthFailed
    };

    public static ErrorCategory Classify(Exception ex)
    {
        var msg = ex.Message.ToLowerInvariant();

        if (msg.Contains("rate limit") || msg.Contains("429") || msg.Contains("too many"))
            return ErrorCategory.RateLimited;
        if (msg.Contains("quota") || msg.Contains("456"))
            return ErrorCategory.QuotaExceeded;
        if (msg.Contains("credentials") || msg.Contains("not set") || msg.Contains("api key"))
            return ErrorCategory.AuthFailed;
        if (msg.Contains("timed out") || msg.Contains("timeout") || msg.Contains("cancel"))
            return ErrorCategory.Timeout;
        if (msg.Contains("fetch failed") || msg.Contains("connectionrefused") || msg.Contains("network") || msg.Contains("dns"))
            return ErrorCategory.Network;
        return ErrorCategory.Unknown;
    }

    public static bool ShouldTripCircuit(ErrorCategory category) => !NoCircuitTrip.Contains(category);
}
