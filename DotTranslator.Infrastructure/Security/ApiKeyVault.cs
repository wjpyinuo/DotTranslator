using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DotTranslator.Core.Security;
using Microsoft.Extensions.Logging;

namespace DotTranslator.Infrastructure.Security;

/// <summary>
/// Windows DPAPI 加密存储实现。
/// 非 Windows 平台回退到 Base64 编码（非安全，仅兼容）。
/// </summary>
public class ApiKeyVault : IApiKeyStore
{
    private readonly string _storePath;
    private readonly ILogger<ApiKeyVault>? _logger;
    private Dictionary<string, string> _keys = new();

    public ApiKeyVault(string storePath, ILogger<ApiKeyVault>? logger = null)
    {
        _storePath = storePath;
        _logger = logger;
        Load();
    }

    public string? Get(string key) => _keys.GetValueOrDefault(key);

    public void Set(string key, string value)
    {
        _keys[key] = value;
        Save();
    }

    public void Delete(string key)
    {
        _keys.Remove(key);
        Save();
    }

    public bool IsAvailable() => true; // 现在总是可用，Windows 用 DPAPI，其他平台回退

    private void Load()
    {
        try
        {
            if (!File.Exists(_storePath)) return;
            var encrypted = File.ReadAllBytes(_storePath);
            byte[] decrypted;

            if (OperatingSystem.IsWindows())
            {
                decrypted = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
            }
            else
            {
                // 非 Windows 回退：Base64 解码（非加密，仅兼容）
                _logger?.LogWarning("[ApiKeyVault] Non-Windows platform: using Base64 fallback (not encrypted)");
                decrypted = encrypted;
            }

            _keys = JsonSerializer.Deserialize<Dictionary<string, string>>(Encoding.UTF8.GetString(decrypted)) ?? new();
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "[ApiKeyVault] Failed to load keys, starting fresh");
            _keys = new Dictionary<string, string>();
        }
    }

    private void Save()
    {
        var json = JsonSerializer.Serialize(_keys);
        var plainBytes = Encoding.UTF8.GetBytes(json);
        byte[] output;

        if (OperatingSystem.IsWindows())
        {
            output = ProtectedData.Protect(plainBytes, null, DataProtectionScope.CurrentUser);
        }
        else
        {
            // 非 Windows 回退：直接写入（非加密）
            output = plainBytes;
        }

        var dir = Path.GetDirectoryName(_storePath);
        if (dir != null && !Directory.Exists(dir)) Directory.CreateDirectory(dir);
        File.WriteAllBytes(_storePath, output);
    }
}
