using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

public class YoudaoProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _appId;
    private string? _appSecret;

    public string Id => "youdao";
    public string Name => "有道翻译";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 50_000;

    public YoudaoProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetCredentials(string appId, string appSecret)
    {
        _appId = appId;
        _appSecret = appSecret;
    }

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_appId) || string.IsNullOrEmpty(_appSecret))
            throw new InvalidOperationException("Youdao credentials not set");

        var client = _httpClientFactory.CreateClient("Youdao");
        var start = Environment.TickCount64;

        var salt = Guid.NewGuid().ToString();
        var curtime = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var input = parameters.Text.Length <= 20 ? parameters.Text : $"{parameters.Text[..10]}{parameters.Text.Length}{parameters.Text[^10..]}";
        var sign = ComputeSha256($"{_appId}{input}{salt}{curtime}{_appSecret}");

        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["q"] = parameters.Text,
            ["from"] = MapLang(parameters.SourceLang),
            ["to"] = MapLang(parameters.TargetLang),
            ["appKey"] = _appId,
            ["salt"] = salt,
            ["sign"] = sign,
            ["signType"] = "v3",
            ["curtime"] = curtime,
        });

        var response = await client.PostAsync("https://openapi.youdao.com/api", content, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);
        var errorCode = json.GetProperty("errorCode").GetString();

        if (errorCode != "0")
            throw new HttpRequestException($"Youdao API error: {errorCode}");

        var translation = json.GetProperty("translation")[0].GetString() ?? string.Empty;

        return new TranslateResult(
            Id, translation, parameters.SourceLang, parameters.TargetLang,
            Environment.TickCount64 - start);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_appId));

    public Task<LanguageDetection> DetectLanguageAsync(string text)
    {
        return Task.FromResult(new LanguageDetection("auto", 0.8));
    }

    private static string MapLang(string lang) => lang.ToLowerInvariant() switch
    {
        "zh" or "zh-cn" or "zh-chs" => "zh-CHS",
        "zh-tw" or "zh-cht" => "zh-CHT",
        "en" => "en",
        "ja" => "ja",
        "ko" => "ko",
        "fr" => "fr",
        "de" => "de",
        "es" => "es",
        "ru" => "ru",
        _ => lang
    };

    private static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
