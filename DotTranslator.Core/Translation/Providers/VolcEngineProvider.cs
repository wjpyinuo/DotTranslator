using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

/// <summary>
/// 火山翻译 (VolcEngine / ByteDance)
/// Free: 200万字符/月
/// Apply: https://www.volcengine.com/product/imagetrans
/// </summary>
public class VolcEngineProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _accessKeyId;
    private string? _secretAccessKey;
    private string _region = "cn-north-1";

    public string Id => "volcengine";
    public string Name => "火山翻译";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 5_000;

    public VolcEngineProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetCredentials(string accessKeyId, string secretAccessKey, string region = "cn-north-1")
    {
        _accessKeyId = accessKeyId;
        _secretAccessKey = secretAccessKey;
        _region = region;
    }

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_accessKeyId) || string.IsNullOrEmpty(_secretAccessKey))
            throw new InvalidOperationException("VolcEngine credentials not set");

        var client = _httpClientFactory.CreateClient("VolcEngine");
        var start = Environment.TickCount64;

        // VolcEngine uses HMAC-SHA256 signing similar to AWS
        var host = "translate.volcengineapi.com";
        var body = JsonSerializer.Serialize(new
        {
            SourceLanguage = parameters.SourceLang == "auto" ? "detect" : parameters.SourceLang,
            TargetLanguage = parameters.TargetLang,
            TextList = new[] { parameters.Text }
        });

        var date = DateTime.UtcNow;
        var dateStr = date.ToString("yyyyMMddTHHmmssZ");
        var dateShort = date.ToString("yyyyMMdd");

        var hashedPayload = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();

        var canonicalHeaders = $"content-type:application/json\nhost:{host}\nx-date:{dateStr}\n";
        var signedHeaders = "content-type;host;x-date";
        var canonicalRequest = $"POST\n/\nAction=TranslateText&Version=2020-06-01\n{canonicalHeaders}\n{signedHeaders}\n{hashedPayload}";

        var credentialScope = $"{dateShort}/{_region}/translate/request";
        var hashedRequest = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonicalRequest))).ToLowerInvariant();
        var stringToSign = $"HMAC-SHA256\n{dateStr}\n{credentialScope}\n{hashedRequest}";

        byte[] HmacSha256(byte[] key, string msg) => HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(msg));
        var kDate = HmacSha256(Encoding.UTF8.GetBytes(_secretAccessKey), dateShort);
        var kRegion = HmacSha256(kDate, _region);
        var kService = HmacSha256(kRegion, "translate");
        var kSigning = HmacSha256(kService, "request");
        var signature = Convert.ToHexString(HmacSha256(kSigning, stringToSign)).ToLowerInvariant();

        var authorization = $"HMAC-SHA256 Credential={_accessKeyId}/{credentialScope}, SignedHeaders={signedHeaders}, Signature={signature}";

        var request = new HttpRequestMessage(HttpMethod.Post,
            $"https://{host}/?Action=TranslateText&Version=2020-06-01")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("X-Date", dateStr);
        request.Headers.Add("Authorization", authorization);

        var response = await client.SendAsync(request, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);
        var translated = json.GetProperty("TranslationList")[0].GetProperty("Translation").GetString() ?? "";

        return new TranslateResult(Id, translated, parameters.SourceLang, parameters.TargetLang, Environment.TickCount64 - start);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_accessKeyId));
    public Task<LanguageDetection> DetectLanguageAsync(string text) => Task.FromResult(new LanguageDetection("auto", 0.8));
}
