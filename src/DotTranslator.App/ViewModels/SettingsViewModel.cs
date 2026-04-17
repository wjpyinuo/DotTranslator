using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DotTranslator.Core.Security;
using DotTranslator.Infrastructure.Data;
using DotTranslator.Shared.Constants;
using System;
using System.Threading.Tasks;

namespace DotTranslator.App.ViewModels;

public partial class SettingsViewModel : ObservableObject
{
    private readonly ApiKeyVault _vault;
    private readonly SqliteRepository _repo;

    [ObservableProperty] private string _deeplApiKey = string.Empty;
    [ObservableProperty] private string _youdaoAppId = string.Empty;
    [ObservableProperty] private string _youdaoAppSecret = string.Empty;
    [ObservableProperty] private string _baiduAppId = string.Empty;
    [ObservableProperty] private string _baiduSecretKey = string.Empty;
    [ObservableProperty] private bool _telemetryEnabled;
    [ObservableProperty] private string _theme = "light";
    [ObservableProperty] private string _statusMessage = string.Empty;

    public string AppVersion => AppConstants.AppVersion;

    public SettingsViewModel(ApiKeyVault vault, SqliteRepository repo)
    {
        _vault = vault;
        _repo = repo;
        LoadSettings();
    }

    private void LoadSettings()
    {
        DeeplApiKey = _vault.Get("deeplApiKey") ?? string.Empty;
        YoudaoAppId = _vault.Get("youdaoAppId") ?? string.Empty;
        YoudaoAppSecret = _vault.Get("youdaoAppSecret") ?? string.Empty;
        BaiduAppId = _vault.Get("baiduAppId") ?? string.Empty;
        BaiduSecretKey = _vault.Get("baiduSecretKey") ?? string.Empty;
        Theme = _repo.GetSetting("theme") ?? "light";
    }

    [RelayCommand]
    private void SaveApiKeys()
    {
        if (!string.IsNullOrWhiteSpace(DeeplApiKey))
            _vault.Set("deeplApiKey", DeeplApiKey);
        if (!string.IsNullOrWhiteSpace(YoudaoAppId))
            _vault.Set("youdaoAppId", YoudaoAppId);
        if (!string.IsNullOrWhiteSpace(YoudaoAppSecret))
            _vault.Set("youdaoAppSecret", YoudaoAppSecret);
        if (!string.IsNullOrWhiteSpace(BaiduAppId))
            _vault.Set("baiduAppId", BaiduAppId);
        if (!string.IsNullOrWhiteSpace(BaiduSecretKey))
            _vault.Set("baiduSecretKey", BaiduSecretKey);

        StatusMessage = "API Key 已保存（加密存储）";
    }

    [RelayCommand]
    private void SaveTheme()
    {
        _repo.SetSetting("theme", Theme);
        App.SwitchTheme(Theme);
        StatusMessage = $"主题已切换为: {Theme}";
    }

    [RelayCommand]
    private void ClearAllData()
    {
        _repo.ClearAll();
        StatusMessage = "所有翻译历史已清除";
    }
}
