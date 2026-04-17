using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

/// <summary>
/// 阿里翻译 (Alibaba Cloud Machine Translation)
/// Free: 100万字符/月 (通用版)
/// Apply: https://www.aliyun.com/product/nls/trans
/// </summary>
public class AlibabaProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _accessKeyId;
    private string? _accessKeySecret;

    public string Id => "alibaba";
    public string Name => "阿里翻译";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 5_000;

    public AlibabaProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetCredentials(string accessKeyId, string accessKeySecret)
    {
        _accessKeyId = accessKeyId;
        _accessKeySecret = accessKeySecret;
    }

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_accessKeyId) || string.IsNullOrEmpty(_accessKeySecret))
            throw new InvalidOperationException("Alibaba credentials not set");

        var client = _httpClientFactory.CreateClient("Alibaba");
        var start = Environment.TickCount64;

        // Alibaba Cloud Translate API (HTTP RPC)
        var query = new Dictionary<string, string>
        {
            ["Action"] = "TranslateGeneral",
            ["Format"] = "JSON",
            ["Version"] = "2018-10-12",
            ["AccessKeyId"] = _accessKeyId,
            ["Timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ["SignatureMethod"] = "HMAC-SHA1",
            ["SignatureVersion"] = "1.0",
            ["SignatureNonce"] = Guid.NewGuid().ToString(),
            ["SourceLanguage"] = parameters.SourceLang == "auto" ? "auto" : parameters.SourceLang,
            ["TargetLanguage"] = parameters.TargetLang,
            ["SourceText"] = parameters.Text,
            ["Scene"] = "general",
        };

        // Sort and sign
        var sorted = query.OrderBy(k => k.Key).ToList();
        var canonical = string.Join("&", sorted.Select(k => $"{Uri.EscapeDataString(k.Key)}={Uri.EscapeDataString(k.Value)}"));
        var stringToSign = $"POST&{Uri.EscapeDataString("/")}&{Uri.EscapeDataString(canonical)}";
        var signKey = $"{_accessKeySecret}&";
        var signature = Convert.ToBase64String(
            HMACSHA1.HashData(Encoding.UTF8.GetBytes(signKey), Encoding.UTF8.GetBytes(stringToSign)));
        query["Signature"] = signature;

        var content = new FormUrlEncodedContent(query);
        var response = await client.PostAsync("https://mt.cn-hangzhou.aliyuncs.com/", content, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);
        var translated = json.GetProperty("Data").GetProperty("Translated").GetString() ?? "";

        return new TranslateResult(Id, translated, parameters.SourceLang, parameters.TargetLang, Environment.TickCount64 - start);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_accessKeyId));
    public Task<LanguageDetection> DetectLanguageAsync(string text) => Task.FromResult(new LanguageDetection("auto", 0.8));
}
