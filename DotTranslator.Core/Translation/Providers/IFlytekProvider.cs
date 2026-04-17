using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

/// <summary>
/// 讯飞翻译 V2 (iFLYTEK Translation V2)
/// Free: 每天 2万字符
/// Apply: https://www.xfyun.cn/service/translation
/// </summary>
public class IFlytekProvider : ITranslationProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _appId;
    private string? _apiKey;
    private string? _apiSecret;

    public string Id => "iflytek";
    public string Name => "讯飞翻译V2";
    public bool RequiresApiKey => true;
    public int MaxTextLength => 5_000;

    public IFlytekProvider(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public void SetCredentials(string appId, string apiKey, string apiSecret)
    {
        _appId = appId;
        _apiKey = apiKey;
        _apiSecret = apiSecret;
    }

    public async Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        if (string.IsNullOrEmpty(_appId) || string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_apiSecret))
            throw new InvalidOperationException("iFLYTEK credentials not set");

        var client = _httpClientFactory.CreateClient("IFlytek");
        var start = Environment.TickCount64;

        // iFLYTEK uses HMAC-SHA256 authentication
        var host = "ntrans.xfyun.cn";
        var path = "/v2/ots";
        var date = DateTime.UtcNow.ToString("r"); // RFC1123
        var url = $"https://{host}{path}";

        var body = JsonSerializer.Serialize(new
        {
            common = new { app_id = _appId },
            business = new
            {
                from = MapLang(parameters.SourceLang),
                to = MapLang(parameters.TargetLang)
            },
            data = new
            {
                text = Convert.ToBase64String(Encoding.UTF8.GetBytes(parameters.Text))
            }
        });

        // Signature: HMAC-SHA256(host + "\n" + date + "\n" + "POST " + path + " HTTP/1.1", apiSecret)
        var signatureOrigin = $"host: {host}\ndate: {date}\nPOST {path} HTTP/1.1";
        var signature = Convert.ToBase64String(
            HMACSHA256.HashData(Encoding.UTF8.GetBytes(_apiSecret), Encoding.UTF8.GetBytes(signatureOrigin)));

        var authorization = $"api_key=\"{_apiKey}\", algorithm=\"hmac-sha256\", headers=\"host date request-line\", signature=\"{signature}\"";

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Host", host);
        request.Headers.Add("Date", date);
        request.Headers.Add("Authorization", authorization);

        var response = await client.SendAsync(request, parameters.CancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(parameters.CancellationToken);
        var encoded = json.GetProperty("data").GetProperty("result").GetProperty("trans_result").GetProperty("dst").GetString() ?? "";
        var translated = Encoding.UTF8.GetString(Convert.FromBase64String(encoded));

        return new TranslateResult(Id, translated, parameters.SourceLang, parameters.TargetLang, Environment.TickCount64 - start);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(!string.IsNullOrEmpty(_appId));
    public Task<LanguageDetection> DetectLanguageAsync(string text) => Task.FromResult(new LanguageDetection("auto", 0.8));

    private static string MapLang(string lang) => lang.ToLowerInvariant() switch
    {
        "zh" or "zh-cn" => "cn",
        "en" => "en",
        "ja" => "ja",
        "ko" => "ko",
        "fr" => "fr",
        "es" => "es",
        "ru" => "ru",
        "de" => "de",
        _ => lang
    };
}
