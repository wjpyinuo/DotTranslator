using System.Net.Http.Json;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

/// <summary>
/// 彩云小译 (Caiyun Translation)
/// Free: 100万字符/月
/// Apply: https://fanyi.caiyunapp.com
/// </summary>
public class CaiyunProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _token;

    public string Id => "caiyun";
    public string Name => "彩云小译";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 5_000;

    public CaiyunProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetToken(string token) => _token = token;

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_token))
            throw new InvalidOperationException("Caiyun token not set");

        var client = _httpClientFactory.CreateClient("Caiyun");
        var start = Environment.TickCount64;

        var direction = (parameters.SourceLang, parameters.TargetLang) switch
        {
            ("zh", "en") or ("zh-cn", "en") => "zh2en",
            ("en", "zh") or ("en", "zh-cn") => "en2zh",
            ("ja", "zh") or ("ja", "zh-cn") => "ja2zh",
            ("zh", "ja") or ("zh-cn", "ja") => "zh2ja",
            _ => $"{parameters.SourceLang}2{parameters.TargetLang}"
        };

        var body = JsonSerializer.Serialize(new
        {
            source = new[] { parameters.Text },
            trans_type = direction,
            request_id = Guid.NewGuid().ToString("N")[..8]
        });

        var request = new HttpRequestMessage(HttpMethod.Post,
            "https://api.interpreter.caiyunai.com/v1/translator")
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json")
        };
        request.Headers.Add("X-Authorization", $"token {_token}");

        var response = await client.SendAsync(request, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);
        var translated = json.GetProperty("target")[0].GetString() ?? "";

        return new TranslateResult(Id, translated, parameters.SourceLang, parameters.TargetLang, Environment.TickCount64 - start);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_token));
    public Task<LanguageDetection> DetectLanguageAsync(string text) => Task.FromResult(new LanguageDetection("auto", 0.8));
}
