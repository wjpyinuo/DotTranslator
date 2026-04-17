using DotTranslator.Shared.Constants;
using Microsoft.Extensions.Logging;

namespace DotTranslator.Core.Telemetry;

public class TelemetryReporter : IDisposable
{
    private readonly ILogger<TelemetryReporter> _logger;
    private readonly Queue<TelemetryEvent> _queue = new();
    private Timer? _heartbeatTimer;
    private Timer? _flushTimer;
    private string _instanceId = string.Empty;
    private bool _enabled;

    public string InstanceId => _instanceId;

    public TelemetryReporter(ILogger<TelemetryReporter> logger)
    {
        _logger = logger;
    }

    public void Start(string instanceId, bool enabled)
    {
        _instanceId = instanceId;
        _enabled = enabled;
        if (!enabled) return;

        _heartbeatTimer = new Timer(_ => EnqueueHeartbeat(), null, 300_000, 300_000);
        _flushTimer = new Timer(_ => Flush(), null, 30_000, 30_000);
    }

    public void SetEnabled(bool enabled)
    {
        _enabled = enabled;
        if (!enabled) _queue.Clear();
    }

    public void TrackFeature(string feature, Dictionary<string, object>? metadata = null)
    {
        if (!_enabled) return;
        Enqueue(new TelemetryEvent("feature", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            new EventPayload(_instanceId, AppConstants.AppVersion, feature, metadata)));
    }

    public void RecordTranslation(TranslationDetail detail)
    {
        TrackFeature(FeatureNames.TranslateManual, new Dictionary<string, object>
        {
            ["provider"] = detail.Provider,
            ["charCount"] = BucketCharCount(detail.CharCount),
            ["success"] = detail.Success ? 1 : 0
        });
    }

    private void EnqueueHeartbeat()
    {
        Enqueue(new TelemetryEvent("heartbeat", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            new EventPayload(_instanceId, AppConstants.AppVersion, null)));
    }

    private void Enqueue(TelemetryEvent evt)
    {
        if (_queue.Count < 200) _queue.Enqueue(evt);
    }

    private void Flush()
    {
        _logger.LogDebug("[Telemetry] Flushing {Count} events", _queue.Count);
        _queue.Clear();
    }

    private static int BucketCharCount(int count) => count switch
    {
        < 50 => 50,
        < 200 => 200,
        < 1000 => 1000,
        < 5000 => 5000,
        _ => 10000
    };

    public void Stop()
    {
        _heartbeatTimer?.Dispose();
        _flushTimer?.Dispose();
        Flush();
    }

    public void Dispose()
    {
        Stop();
    }
}

public record TelemetryEvent(string Type, long Timestamp, EventPayload Payload);
public record EventPayload(string InstanceId, string Version, string? Feature, Dictionary<string, object>? Metadata = null);
public record TranslationDetail(string Provider, string SourceLang, string TargetLang, int CharCount, long LatencyMs, bool Success);
