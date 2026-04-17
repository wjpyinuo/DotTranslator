using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace DotTranslator.Infrastructure.Update;

public record UpdateInfo(string Version, string DownloadUrl, string? ReleaseNotes);

public class AutoUpdater
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AutoUpdater> _logger;
    private readonly string _repoOwner;
    private readonly string _repoName;

    public AutoUpdater(string repoOwner, string repoName, ILogger<AutoUpdater> logger)
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("DotTranslator-Updater");
        _logger = logger;
        _repoOwner = repoOwner;
        _repoName = repoName;
    }

    public async Task<UpdateInfo?> CheckAsync(string currentVersion)
    {
        try
        {
            var url = $"https://api.github.com/repos/{_repoOwner}/{_repoName}/releases/latest";
            var response = await _httpClient.GetStringAsync(url);
            var json = JsonDocument.Parse(response).RootElement;

            var tagName = json.GetProperty("tag_name").GetString()?.TrimStart('v') ?? "";
            if (tagName == currentVersion) return null;

            var assets = json.GetProperty("assets");
            string? downloadUrl = null;
            foreach (var asset in assets.EnumerateArray())
            {
                var name = asset.GetProperty("name").GetString();
                if (name != null && name.EndsWith(".zip"))
                {
                    downloadUrl = asset.GetProperty("browser_download_url").GetString();
                    break;
                }
            }

            if (downloadUrl == null) return null;

            var notes = json.GetProperty("body").GetString();
            return new UpdateInfo(tagName, downloadUrl, notes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Update check failed");
            return null;
        }
    }

    public async Task DownloadAsync(string url, string destinationPath, IProgress<double>? progress = null)
    {
        using var response = await _httpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
        response.EnsureSuccessStatusCode();

        var totalBytes = response.Content.Headers.ContentLength ?? -1;
        await using var contentStream = await response.Content.ReadAsStreamAsync();
        await using var fileStream = new FileStream(destinationPath, FileMode.Create, FileAccess.Write, FileShare.None, 8192, true);

        var buffer = new byte[8192];
        long totalRead = 0;
        int bytesRead;

        while ((bytesRead = await contentStream.ReadAsync(buffer)) > 0)
        {
            await fileStream.WriteAsync(buffer.AsMemory(0, bytesRead));
            totalRead += bytesRead;
            if (totalBytes > 0)
                progress?.Report((double)totalRead / totalBytes);
        }
    }
}
