using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace DotTranslator.Infrastructure.Update;

public record UpdateInfo(string Version, string DownloadUrl, string? ReleaseNotes, string? ChecksumUrl = null);

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
            string? checksumUrl = null;

            foreach (var asset in assets.EnumerateArray())
            {
                var name = asset.GetProperty("name").GetString();
                if (name == null) continue;

                if (name.EndsWith(".zip"))
                    downloadUrl ??= asset.GetProperty("browser_download_url").GetString();
                else if (name.EndsWith(".sha256") || name.Contains("checksum"))
                    checksumUrl ??= asset.GetProperty("browser_download_url").GetString();
            }

            if (downloadUrl == null) return null;

            var notes = json.GetProperty("body").GetString();
            return new UpdateInfo(tagName, downloadUrl, notes, checksumUrl);
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

    /// <summary>
    /// 下载并校验文件完整性。如果提供了 checksumUrl，则下载校验文件并验证 SHA256。
    /// </summary>
    /// <returns>校验通过返回 true；无校验文件时返回 null（不验证）；校验失败抛出异常。</returns>
    public async Task<bool?> DownloadAndVerifyAsync(
        string downloadUrl, string destinationPath,
        string? checksumUrl = null, IProgress<double>? progress = null)
    {
        await DownloadAsync(downloadUrl, destinationPath, progress);

        if (string.IsNullOrEmpty(checksumUrl))
        {
            _logger.LogWarning("[AutoUpdater] No checksum file available for this release, skipping verification");
            return null;
        }

        // 下载校验文件
        string expectedHash;
        try
        {
            var checksumContent = await _httpClient.GetStringAsync(checksumUrl);
            // 支持两种格式: "hash  filename" 或 纯 hash
            expectedHash = checksumContent.Trim().Split(' ')[0].Trim().ToLowerInvariant();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[AutoUpdater] Failed to download checksum file");
            return null;
        }

        // 计算实际文件 SHA256
        var actualHash = await ComputeSha256Async(destinationPath);

        if (!string.Equals(expectedHash, actualHash, StringComparison.OrdinalIgnoreCase))
        {
            // 删除不完整的/被篡改的文件
            try { File.Delete(destinationPath); } catch { /* best effort */ }
            throw new InvalidOperationException(
                $"[AutoUpdater] SHA256 mismatch! Expected: {expectedHash}, Got: {actualHash}");
        }

        _logger.LogInformation("[AutoUpdater] SHA256 verification passed: {Hash}", actualHash);
        return true;
    }

    private static async Task<string> ComputeSha256Async(string filePath)
    {
        await using var stream = File.OpenRead(filePath);
        var hash = await SHA256.HashDataAsync(stream);
        return Convert.ToHexStringLower(hash);
    }
}
