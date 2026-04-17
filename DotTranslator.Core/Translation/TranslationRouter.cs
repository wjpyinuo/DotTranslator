using Microsoft.Extensions.Logging;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using Polly.Timeout;
using DotTranslator.Shared.Models;
using DotTranslator.Shared.Constants;

namespace DotTranslator.Core.Translation;

public class TranslationRouter : ITranslationService
{
    private readonly Dictionary<string, ITranslationProvider> _providers = new();
    private readonly Dictionary<string, ResiliencePipeline<TranslateResult>> _pipelines = new();
    private readonly Dictionary<string, double> _errorRates = new();
    private readonly ILogger<TranslationRouter> _logger;

    public TranslationRouter(IEnumerable<ITranslationProvider> providers, ILogger<TranslationRouter> logger)
    {
        _logger = logger;
        foreach (var p in providers)
        {
            _providers[p.Id] = p;
            _pipelines[p.Id] = BuildPipeline(p.Id);
        }
    }

    private ResiliencePipeline<TranslateResult> BuildPipeline(string providerId)
    {
        return new ResiliencePipelineBuilder<TranslateResult>()
            .AddTimeout(new TimeoutStrategyOptions
            {
                Timeout = TimeSpan.FromMilliseconds(AppConstants.DefaultTranslationTimeoutMs),
            })
            .AddCircuitBreaker(new CircuitBreakerStrategyOptions<TranslateResult>
            {
                FailureRatio = 0.5,
                SamplingDuration = TimeSpan.FromSeconds(30),
                MinimumThroughput = AppConstants.CircuitBreakerFailureThreshold,
                BreakDuration = TimeSpan.FromMilliseconds(AppConstants.CircuitBreakerCooldownMs),
                ShouldHandle = new PredicateBuilder<TranslateResult>()
                    .Handle<Exception>(ex => ErrorClassifier.ShouldTripCircuit(ErrorClassifier.Classify(ex))),
            })
            .AddRetry(new RetryStrategyOptions<TranslateResult>
            {
                ShouldHandle = new PredicateBuilder<TranslateResult>()
                    .Handle<HttpRequestException>(),
                MaxRetryAttempts = 1,
                Delay = TimeSpan.FromSeconds(1),
                BackoffType = DelayBackoffType.Constant,
            })
            .Build();
    }

    public ITranslationProvider? GetProvider(string id) => _providers.GetValueOrDefault(id);

    public IReadOnlyList<ITranslationProvider> GetAllProviders() => _providers.Values.ToList();

    public async Task<TranslateResult> TranslateAsync(string providerId, TranslateParams parameters)
    {
        if (!_providers.TryGetValue(providerId, out var provider))
            throw new ArgumentException($"Provider '{providerId}' not found");

        if (string.IsNullOrWhiteSpace(parameters.Text))
            throw new ArgumentException("Translation text is empty");

        if (parameters.Text.Length > provider.MaxTextLength)
            throw new ArgumentException($"Text too long ({parameters.Text.Length} chars, max {provider.MaxTextLength})");

        var pipeline = _pipelines[providerId];
        var result = await pipeline.ExecuteAsync(
            async ct => await provider.TranslateAsync(parameters with { CancellationToken = ct }),
            parameters.CancellationToken);

        RecordSuccess(providerId);
        return result;
    }

    public async Task<CompareResult> TranslateCompareAsync(TranslateParams parameters, IEnumerable<string> enabledProviderIds)
    {
        var tasks = enabledProviderIds
            .Where(id => _providers.ContainsKey(id))
            .Select(async id =>
            {
                try
                {
                    var result = await TranslateAsync(id, parameters);
                    return (Success: true, Result: result, Error: (CompareError?)null);
                }
                catch (Exception ex)
                {
                    return (Success: false, Result: (TranslateResult?)null,
                        Error: new CompareError(id, ex.Message, ErrorClassifier.Classify(ex)));
                }
            });

        var settled = await Task.WhenAll(tasks);
        return new CompareResult(
            settled.Where(s => s.Success && s.Result != null).Select(s => s.Result!).ToList(),
            settled.Where(s => s.Error != null).Select(s => s.Error!).ToList());
    }

    public async Task<TranslateResult> SmartRouteAsync(TranslateParams parameters, IEnumerable<string> enabledProviderIds)
    {
        var candidates = new List<(string Id, double Score)>();

        foreach (var id in enabledProviderIds)
        {
            if (!_providers.TryGetValue(id, out var provider)) continue;
            if (!await provider.IsAvailableAsync()) continue;

            var errorRate = _errorRates.GetValueOrDefault(id, 0);
            var costScore = provider.RequiresApiKey ? 0.7 : 1.0;
            var score = AppConstants.ScoringWeightErrorRate * (1 - errorRate)
                      + AppConstants.ScoringWeightCost * costScore
                      + AppConstants.ScoringWeightAvailability;
            candidates.Add((id, score));
        }

        if (candidates.Count == 0)
            throw new InvalidOperationException("No available translation providers");

        var best = candidates.OrderByDescending(c => c.Score).First();
        return await TranslateAsync(best.Id, parameters);
    }

    private void RecordSuccess(string providerId)
    {
        var prev = _errorRates.GetValueOrDefault(providerId, 0);
        _errorRates[providerId] = prev * 0.7;
    }

    public IReadOnlyDictionary<string, double> GetErrorRates() => _errorRates;

    public IReadOnlyList<PersistedCircuit> ExportCircuitStates()
    {
        return _errorRates
            .Where(kvp => kvp.Value > 0)
            .Select(kvp => new PersistedCircuit(kvp.Key, 0, "closed", 0, kvp.Value))
            .ToList();
    }
}
