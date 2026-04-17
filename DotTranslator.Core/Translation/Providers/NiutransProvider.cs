using System.Net.Http.Json;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

/// <summary>
/// 小牛翻译 (Niutrans)
/// Free: 注册送 20万字符/天
/// Apply: https://niutrans.com
/// </summary>
public class NiutransProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _apiKey;

    public string Id => "niutrans";
    public string Name => "小牛翻译";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 5_000;

    public NiutransProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetApiKey(string apiKey) => _apiKey = apiKey;

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_apiKey))
            throw new InvalidOperationException("Niutrans API key not set");

        var client = _httpClientFactory.CreateClient("Niutrans");
        var start = Environment.TickCount64;

        var url = $"https://api.niutrans.com/v2/translate?apikey={_apiKey}" +
                  $"&src_text={Uri.EscapeDataString(parameters.Text)}" +
                  $"&from={MapLang(parameters.SourceLang)}" +
                  $"&to={MapLang(parameters.TargetLang)}";

        var response = await client.GetAsync(url, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);

        if (json.TryGetProperty("tgt_text", out var tgt))
            return new TranslateResult(Id, tgt.GetString() ?? "", parameters.SourceLang, parameters.TargetLang, Environment.TickCount64 - start);
        if (json.TryGetProperty("error_msg", out var err))
            throw new HttpRequestException($"Niutrans error: {err.GetString()}");

        throw new HttpRequestException("Niutrans: unexpected response");
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_apiKey));
    public Task<LanguageDetection> DetectLanguageAsync(string text) => Task.FromResult(new LanguageDetection("auto", 0.8));

    private static string MapLang(string lang) => lang.ToLowerInvariant() switch
    {
        "zh" or "zh-cn" => "zh",
        "en" => "en",
        "ja" => "ja",
        "ko" => "ko",
        "fr" => "fr",
        "de" => "de",
        "es" => "es",
        "ru" => "ru",
        _ => lang
    };
}
