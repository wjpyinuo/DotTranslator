using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DotTranslator.Core.Security;

public class ApiKeyVault
{
    private readonly string _storePath;
    private Dictionary<string, string> _keys = new();

    public ApiKeyVault(string storePath)
    {
        _storePath = storePath;
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

    public bool IsAvailable() => OperatingSystem.IsWindows();

    private void Load()
    {
        try
        {
            if (!File.Exists(_storePath)) return;
            var encrypted = File.ReadAllBytes(_storePath);
            var decrypted = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
            _keys = JsonSerializer.Deserialize<Dictionary<string, string>>(Encoding.UTF8.GetString(decrypted)) ?? new();
        }
        catch
        {
            _keys = new Dictionary<string, string>();
        }
    }

    private void Save()
    {
        var json = JsonSerializer.Serialize(_keys);
        var encrypted = ProtectedData.Protect(Encoding.UTF8.GetBytes(json), null, DataProtectionScope.CurrentUser);
        var dir = Path.GetDirectoryName(_storePath);
        if (dir != null && !Directory.Exists(dir)) Directory.CreateDirectory(dir);
        File.WriteAllBytes(_storePath, encrypted);
    }
}
