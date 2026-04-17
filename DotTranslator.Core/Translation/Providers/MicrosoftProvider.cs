using System.Net.Http.Json;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

/// <summary>
/// Microsoft Translator (Azure AI Translator)
/// Free: 2M chars/month on Azure free tier
/// Apply: https://azure.microsoft.com/products/ai-services/ai-translator
/// </summary>
public class MicrosoftProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _apiKey;
    private string _region = "eastus";

    public string Id => "microsoft";
    public string Name => "Microsoft";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 50_000;

    public MicrosoftProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetCredentials(string apiKey, string region = "eastus")
    {
        _apiKey = apiKey;
        _region = region;
    }

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_apiKey))
            throw new InvalidOperationException("Microsoft API key not set");

        var client = _httpClientFactory.CreateClient("Microsoft");
        client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", _apiKey);
        client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Region", _region);

        var start = Environment.TickCount64;
        var body = new[] { new { Text = parameters.Text } };
        var from = parameters.SourceLang == "auto" ? "" : $"&from={parameters.SourceLang}";
        var response = await client.PostAsJsonAsync(
            $"https://api.cognitive.microsofttranslator.com/translate?api-version=3.0{from}&to={parameters.TargetLang}",
            body, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);
        var translatedText = json[0].GetProperty("translations")[0].GetProperty("text").GetString() ?? "";
        var detected = json[0].GetProperty("detectedLanguage").GetProperty("language").GetString() ?? parameters.SourceLang;

        return new TranslateResult(Id, translatedText, detected, parameters.TargetLang, Environment.TickCount64 - start);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_apiKey));
    public Task<LanguageDetection> DetectLanguageAsync(string text) => Task.FromResult(new LanguageDetection("auto", 0.8));
}
