using System.Net.Http.Json;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

/// <summary>
/// Amazon Translate (AWS)
/// Free: 2M chars/month (first 12 months)
/// Apply: https://aws.amazon.com/translate/
/// </summary>
public class AmazonProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _accessKeyId;
    private string? _secretAccessKey;
    private string _region = "us-east-1";

    public string Id => "amazon";
    public string Name => "Amazon";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 5_000; // Per request limit

    public AmazonProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetCredentials(string accessKeyId, string secretAccessKey, string region = "us-east-1")
    {
        _accessKeyId = accessKeyId;
        _secretAccessKey = secretAccessKey;
        _region = region;
    }

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_accessKeyId) || string.IsNullOrEmpty(_secretAccessKey))
            throw new InvalidOperationException("Amazon credentials not set");

        // Amazon Translate requires AWS Signature V4 signing.
        // For simplicity, use the JSON REST API with a pre-signed approach.
        // In production, use AWSSDK.Translate NuGet package.
        var client = _httpClientFactory.CreateClient("Amazon");
        var start = Environment.TickCount64;

        // Note: Real implementation requires SigV4 signing.
        // This is a placeholder showing the API contract.
        // Users should install AWSSDK.Translate for production use.
        throw new NotSupportedException(
            "Amazon Translate requires AWSSDK.Translate NuGet package for SigV4 signing. " +
            "Install via: dotnet add package AWSSDK.Translate");
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_accessKeyId));
    public Task<LanguageDetection> DetectLanguageAsync(string text) => Task.FromResult(new LanguageDetection("auto", 0.8));
}
