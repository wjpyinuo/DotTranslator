using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DotTranslator.Core.Security;
using DotTranslator.Core.Translation.Providers;
using DotTranslator.Infrastructure.Data;
using DotTranslator.Infrastructure.Http;
using DotTranslator.Infrastructure.Update;
using DotTranslator.Shared.Constants;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading.Tasks;

namespace DotTranslator.App.ViewModels;

public partial class SettingsViewModel : ObservableObject
{
    private readonly ApiKeyVault _vault;
    private readonly SqliteRepository _repo;
    private readonly LocalApiServer _localApi;
    private readonly AutoUpdater _autoUpdater;

    [ObservableProperty] private string _deeplApiKey = string.Empty;
    [ObservableProperty] private string _youdaoAppId = string.Empty;
    [ObservableProperty] private string _youdaoAppSecret = string.Empty;
    [ObservableProperty] private string _baiduAppId = string.Empty;
    [ObservableProperty] private string _baiduSecretKey = string.Empty;
    [ObservableProperty] private string _theme = "light";
    [ObservableProperty] private string _statusMessage = string.Empty;
    [ObservableProperty] private string _localApiInfo = string.Empty;
    [ObservableProperty] private string _updateStatus = string.Empty;
    [ObservableProperty] private bool _isCheckingUpdate;

    public string AppVersion => AppConstants.AppVersion;

    public SettingsViewModel(
        ApiKeyVault vault,
        SqliteRepository repo,
        LocalApiServer localApi,
        AutoUpdater autoUpdater)
    {
        _vault = vault;
        _repo = repo;
        _localApi = localApi;
        _autoUpdater = autoUpdater;
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

        if (_localApi.Port > 0)
            LocalApiInfo = $"http://127.0.0.1:{_localApi.Port}  Token: {_localApi.Token}";
        else
            LocalApiInfo = "未启动";
    }

    [RelayCommand]
    private void SaveApiKeys()
    {
        if (!string.IsNullOrWhiteSpace(DeeplApiKey))
        {
            _vault.Set("deeplApiKey", DeeplApiKey);
            App.Services.GetService<DeepLProvider>()?.SetApiKey(DeeplApiKey);
        }

        if (!string.IsNullOrWhiteSpace(YoudaoAppId) && !string.IsNullOrWhiteSpace(YoudaoAppSecret))
        {
            _vault.Set("youdaoAppId", YoudaoAppId);
            _vault.Set("youdaoAppSecret", YoudaoAppSecret);
            App.Services.GetService<YoudaoProvider>()?.SetCredentials(YoudaoAppId, YoudaoAppSecret);
        }

        if (!string.IsNullOrWhiteSpace(BaiduAppId) && !string.IsNullOrWhiteSpace(BaiduSecretKey))
        {
            _vault.Set("baiduAppId", BaiduAppId);
            _vault.Set("baiduSecretKey", BaiduSecretKey);
            App.Services.GetService<BaiduProvider>()?.SetCredentials(BaiduAppId, BaiduSecretKey);
        }

        StatusMessage = "API Key 已保存并生效";
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

    [RelayCommand]
    private async Task CheckUpdateAsync()
    {
        IsCheckingUpdate = true;
        UpdateStatus = "正在检查更新...";

        try
        {
            var info = await _autoUpdater.CheckAsync(AppConstants.AppVersion);
            if (info != null)
                UpdateStatus = $"发现新版本 v{info.Version} — {info.ReleaseNotes?.Split('\n')[0]}";
            else
                UpdateStatus = "已是最新版本";
        }
        catch (Exception ex)
        {
            UpdateStatus = $"检查更新失败: {ex.Message}";
        }
        finally
        {
            IsCheckingUpdate = false;
        }
    }
}
