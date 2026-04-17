using System.Net;
using System.Text;
using System.Text.Json;
using DotTranslator.Core.Translation;
using DotTranslator.Shared.Constants;
using DotTranslator.Shared.Models;
using Microsoft.Extensions.Logging;

namespace DotTranslator.Infrastructure.Http;

public class LocalApiServer : IDisposable
{
    private HttpListener? _listener;
    private readonly string _token;
    private readonly TranslationRouter _router;
    private readonly ILogger<LocalApiServer> _logger;
    private int _port;

    public string Token => _token;
    public int Port => _port;

    public LocalApiServer(TranslationRouter router, ILogger<LocalApiServer> logger)
    {
        _token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        _router = router;
        _logger = logger;
    }

    public void Start()
    {
        for (var port = AppConstants.LocalApiPortStart; port <= AppConstants.LocalApiPortEnd; port++)
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
                _listener.Start();
                _port = port;
                _logger.LogInformation("[LocalAPI] Listening on http://127.0.0.1:{Port}", port);
                _ = ListenLoop();
                return;
            }
            catch
            {
                _listener?.Close();
                _listener = null;
            }
        }
        _logger.LogError("[LocalAPI] Failed to bind to any port");
    }

    private async Task ListenLoop()
    {
        if (_listener == null) return;
        while (_listener.IsListening)
        {
            try
            {
                var ctx = await _listener.GetContextAsync();
                _ = HandleRequest(ctx);
            }
            catch (HttpListenerException) { break; }
            catch (ObjectDisposedException) { break; }
        }
    }

    private async Task HandleRequest(HttpListenerContext ctx)
    {
        var req = ctx.Request;
        var res = ctx.Response;

        try
        {
            // Only localhost
            if (req.RemoteEndPoint.Address != IPAddress.Loopback && req.RemoteEndPoint.Address != IPAddress.IPv6Loopback)
            {
                res.StatusCode = 403; res.Close(); return;
            }

            // Token auth
            var auth = req.Headers["Authorization"];
            if (auth != $"Bearer {_token}")
            {
                res.StatusCode = 401; res.Close(); return;
            }

            res.ContentType = "application/json";

            if (req.Url?.AbsolutePath == "/api/health" && req.HttpMethod == "GET")
            {
                await WriteJson(res, 200, new { status = "ok", version = AppConstants.AppVersion, uptime = Environment.TickCount64 / 1000 });
            }
            else if (req.Url?.AbsolutePath == "/api/providers" && req.HttpMethod == "GET")
            {
                var providers = _router.GetAllProviders().Select(p => new { id = p.Id, name = p.Name, requiresApiKey = p.RequiresApiKey });
                await WriteJson(res, 200, providers);
            }
            else if (req.Url?.AbsolutePath == "/api/translate" && req.HttpMethod == "POST")
            {
                using var reader = new StreamReader(req.InputStream, req.ContentEncoding);
                var body = await reader.ReadToEndAsync();
                var doc = JsonDocument.Parse(body);
                var text = doc.RootElement.GetProperty("text").GetString() ?? "";
                var sourceLang = doc.RootElement.GetProperty("sourceLang").GetString() ?? "auto";
                var targetLang = doc.RootElement.GetProperty("targetLang").GetString() ?? "zh";

                var parameters = new TranslateParams(text, sourceLang, targetLang);
                var result = await _router.TranslateCompareAsync(parameters, _router.GetAllProviders().Select(p => p.Id));
                await WriteJson(res, 200, result);
            }
            else
            {
                await WriteJson(res, 404, new { error = "Not Found" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[LocalAPI] Request error");
            await WriteJson(res, 500, new { error = ex.Message });
        }
    }

    private static async Task WriteJson(HttpListenerResponse res, int statusCode, object data)
    {
        res.StatusCode = statusCode;
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(data));
        await res.OutputStream.WriteAsync(bytes);
        res.Close();
    }

    public void Stop()
    {
        _listener?.Stop();
        _listener?.Close();
    }

    public void Dispose()
    {
        Stop();
    }
}
