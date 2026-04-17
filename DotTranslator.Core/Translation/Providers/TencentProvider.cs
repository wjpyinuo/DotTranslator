using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

/// <summary>
/// 腾讯翻译 (Tencent Cloud Machine Translation)
/// Free: 500万字符/月 (每月)
/// Apply: https://cloud.tencent.com/product/tmt
/// </summary>
public class TencentProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _secretId;
    private string? _secretKey;
    private string _region = "ap-guangzhou";

    public string Id => "tencent";
    public string Name => "腾讯翻译";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 5_000;

    public TencentProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetCredentials(string secretId, string secretKey, string region = "ap-guangzhou")
    {
        _secretId = secretId;
        _secretKey = secretKey;
        _region = region;
    }

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_secretId) || string.IsNullOrEmpty(_secretKey))
            throw new InvalidOperationException("Tencent credentials not set");

        var client = _httpClientFactory.CreateClient("Tencent");
        var start = Environment.TickCount64;

        var body = JsonSerializer.Serialize(new
        {
            SourceText = parameters.Text,
            Source = parameters.SourceLang == "auto" ? "auto" : parameters.SourceLang,
            Target = parameters.TargetLang,
            ProjectId = 0
        });

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var date = DateTimeOffset.UtcNow.UtcDateTime.ToString("yyyy-MM-dd");

        // Tencent Cloud API V3 TC3-HMAC-SHA256 signing
        var httpRequestMethod = "POST";
        var canonicalUri = "/";
        var canonicalQueryString = "";
        var canonicalHeaders = $"content-type:application/json; charset=utf-8\nhost:tmt.tencentcloudapi.com\nx-tc-action:TextTranslate\nx-tc-timestamp:{timestamp}\nx-tc-version:2018-03-21\n";
        var signedHeaders = "content-type;host;x-tc-action;x-tc-timestamp;x-tc-version";
        var hashedPayload = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        var canonicalRequest = $"{httpRequestMethod}\n{canonicalUri}\n{canonicalQueryString}\n{canonicalHeaders}\n{signedHeaders}\n{hashedPayload}";

        var algorithm = "TC3-HMAC-SHA256";
        var requestTimestamp = timestamp.ToString();
        var credentialScope = $"{date}/tmt/tc3_request";
        var hashedRequest = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonicalRequest))).ToLowerInvariant();
        var stringToSign = $"{algorithm}\n{requestTimestamp}\n{credentialScope}\n{hashedRequest}";

        byte[] HmacSha256(byte[] key, string msg) => HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(msg));
        var secretDate = HmacSha256(Encoding.UTF8.GetBytes($"TC3{_secretKey}"), date);
        var secretService = HmacSha256(secretDate, "tmt");
        var secretSigning = HmacSha256(secretService, "tc3_request");
        var signature = Convert.ToHexString(HmacSha256(secretSigning, stringToSign)).ToLowerInvariant();

        var authorization = $"{algorithm} Credential={_secretId}/{credentialScope}, SignedHeaders={signedHeaders}, Signature={signature}";

        var request = new HttpRequestMessage(HttpMethod.Post, "https://tmt.tencentcloudapi.com/")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Authorization", authorization);
        request.Headers.Add("X-TC-Action", "TextTranslate");
        request.Headers.Add("X-TC-Version", "2018-03-21");
        request.Headers.Add("X-TC-Region", _region);
        request.Headers.Add("X-TC-Timestamp", requestTimestamp);

        var response = await client.SendAsync(request, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);
        var translated = json.GetProperty("Response").GetProperty("TargetText").GetString() ?? "";

        return new TranslateResult(Id, translated, parameters.SourceLang, parameters.TargetLang, Environment.TickCount64 - start);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_secretId));
    public Task<LanguageDetection> DetectLanguageAsync(string text) => Task.FromResult(new LanguageDetection("auto", 0.8));
}
