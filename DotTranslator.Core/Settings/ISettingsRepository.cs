namespace DotTranslator.Core.Settings;

/// <summary>
/// 应用设置键值存储抽象。
/// </summary>
public interface ISettingsRepository
{
    string? GetSetting(string key);
    void SetSetting(string key, string value);
}
