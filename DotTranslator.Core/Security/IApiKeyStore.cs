namespace DotTranslator.Core.Security;

/// <summary>
/// API Key 安全存储抽象。
/// Core 层仅依赖此接口，不关心具体加密实现（DPAPI / Keychain / libsecret）。
/// </summary>
public interface IApiKeyStore
{
    string? Get(string key);
    void Set(string key, string value);
    void Delete(string key);
    bool IsAvailable();
}
