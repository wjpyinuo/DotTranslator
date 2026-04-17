using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

public class BaiduProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _appId;
    private string? _secretKey;

    public string Id => "baidu";
    public string Name => "百度翻译";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 50_000;

    public BaiduProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetCredentials(string appId, string secretKey)
    {
        _appId = appId;
        _secretKey = secretKey;
    }

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_appId) || string.IsNullOrEmpty(_secretKey))
            throw new InvalidOperationException("Baidu credentials not set");

        var client = _httpClientFactory.CreateClient("Baidu");
        var start = Environment.TickCount64;

        var salt = Random.Shared.Next(100_000_000).ToString();
        var sign = ComputeMd5($"{_appId}{parameters.Text}{salt}{_secretKey}");

        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["q"] = parameters.Text,
            ["from"] = MapLang(parameters.SourceLang),
            ["to"] = MapLang(parameters.TargetLang),
            ["appid"] = _appId,
            ["salt"] = salt,
            ["sign"] = sign,
        });

        var response = await client.PostAsync("https://fanyi-api.baidu.com/api/trans/vip/translate", content, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);

        if (json.TryGetProperty("error_code", out var errorCode))
            throw new HttpRequestException($"Baidu API error: {errorCode.GetString()} - {json.GetProperty("error_msg").GetString()}");

        var transResult = json.GetProperty("trans_result");
        var translation = new StringBuilder();
        foreach (var item in transResult.EnumerateArray())
        {
            if (translation.Length > 0) translation.AppendLine();
            translation.Append(item.GetProperty("dst").GetString());
        }

        return new TranslateResult(
            Id, translation.ToString(), parameters.SourceLang, parameters.TargetLang,
            Environment.TickCount64 - start);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_appId));

    public Task<LanguageDetection> DetectLanguageAsync(string text)
    {
        return Task.FromResult(new LanguageDetection("auto", 0.8));
    }

    private static string MapLang(string lang) => lang.ToLowerInvariant() switch
    {
        "zh" or "zh-cn" => "zh",
        "en" => "en",
        "ja" => "jp",
        "ko" => "kor",
        "fr" => "fra",
        "de" => "de",
        "es" => "spa",
        "ru" => "ru",
        _ => "auto"
    };

    private static string ComputeMd5(string input)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
