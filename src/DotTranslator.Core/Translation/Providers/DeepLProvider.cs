using System.Net.Http.Json;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

public class DeepLProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _apiKey;

    public string Id => "deepl";
    public string Name => "DeepL";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 50_000;

    public DeepLProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetApiKey(string apiKey) => _apiKey = apiKey;

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_apiKey))
            throw new InvalidOperationException("DeepL API key not set");

        var client = _httpClientFactory.CreateClient("DeepL");
        var start = Environment.TickCount64;

        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["auth_key"] = _apiKey,
            ["text"] = parameters.Text,
            ["source_lang"] = parameters.SourceLang.ToUpperInvariant(),
            ["target_lang"] = parameters.TargetLang.ToUpperInvariant(),
        });

        var baseUrl = _apiKey.EndsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
        var response = await client.PostAsync($"{baseUrl}/v2/translate", content, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);
        var translations = json.GetProperty("translations");
        var translatedText = translations[0].GetProperty("text").GetString() ?? string.Empty;
        var detectedLang = translations[0].GetProperty("detected_source_language").GetString() ?? parameters.SourceLang;

        return new TranslateResult(
            Id, translatedText, detectedLang.ToLowerInvariant(), parameters.TargetLang,
            Environment.TickCount64 - start);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_apiKey));

    public async Task<LanguageDetection> DetectLanguageAsync(string text)
    {
        if (string.IsNullOrEmpty(_apiKey))
            throw new InvalidOperationException("DeepL API key not set");

        var client = _httpClientFactory.CreateClient("DeepL");
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["auth_key"] = _apiKey,
            ["text"] = text,
        });

        var baseUrl = _apiKey.EndsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
        var response = await client.PostAsync($"{baseUrl}/v2/translate", content);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var lang = json.GetProperty("translations")[0].GetProperty("detected_source_language").GetString() ?? "en";
        return new LanguageDetection(lang.ToLowerInvariant(), 0.9);
    }
}
