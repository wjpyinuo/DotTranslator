using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DotTranslator.Core.History;
using DotTranslator.Core.Security;
using DotTranslator.Core.Settings;
using DotTranslator.Core.Translation.Providers;
using DotTranslator.Infrastructure.Http;
using DotTranslator.Infrastructure.Update;
using DotTranslator.Shared.Constants;
using DotTranslator.Shared.Models;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace DotTranslator.App.ViewModels;

/// <summary>
/// 单个 Provider 的凭证配置项
/// </summary>
public partial class ProviderCredentialItem : ObservableObject
{
    public ProviderMeta Meta { get; }

    [ObservableProperty] private string _value1 = "";
    [ObservableProperty] private string _value2 = "";
    [ObservableProperty] private string _value3 = "";
    [ObservableProperty] private string _value4 = "";

    public ProviderCredentialItem(ProviderMeta meta)
    {
        Meta = meta;
    }

    /// <summary>
    /// Returns field info for dynamic binding
    /// </summary>
    public string Field1Label => Meta.RequiredFields.Length > 0 ? Meta.RequiredFields[0] : "";
    public string Field2Label => Meta.RequiredFields.Length > 1 ? Meta.RequiredFields[1] : "";
    public string Field3Label => Meta.RequiredFields.Length > 2 ? Meta.RequiredFields[2] : "";
    public string Field4Label => Meta.RequiredFields.Length > 3 ? Meta.RequiredFields[3] : "";
    public bool HasField2 => Meta.RequiredFields.Length > 1;
    public bool HasField3 => Meta.RequiredFields.Length > 2;
    public bool HasField4 => Meta.RequiredFields.Length > 3;
}

public partial class SettingsViewModel : ObservableObject
{
    private readonly IApiKeyStore _vault;
    private readonly ISettingsRepository _settingsRepo;
    private readonly IHistoryRepository _historyRepo;
    private readonly LocalApiServer _localApi;
    private readonly AutoUpdater _autoUpdater;

    [ObservableProperty] private string _theme = "light";
    [ObservableProperty] private string _statusMessage = string.Empty;
    [ObservableProperty] private string _localApiInfo = string.Empty;
    [ObservableProperty] private string _updateStatus = string.Empty;
    [ObservableProperty] private bool _isCheckingUpdate;

    public string AppVersion => AppConstants.AppVersion;

    public ObservableCollection<ProviderCredentialItem> ProviderCredentials { get; } = new();

    public SettingsViewModel(
        IApiKeyStore vault,
        ISettingsRepository settingsRepo,
        IHistoryRepository historyRepo,
        LocalApiServer localApi,
        AutoUpdater autoUpdater)
    {
        _vault = vault;
        _settingsRepo = settingsRepo;
        _historyRepo = historyRepo;
        _localApi = localApi;
        _autoUpdater = autoUpdater;
        LoadSettings();
    }

    private void LoadSettings()
    {
        Theme = _settingsRepo.GetSetting("theme") ?? "light";

        if (_localApi.Port > 0)
            LocalApiInfo = $"http://127.0.0.1:{_localApi.Port}  Token: {_localApi.Token}";
        else
            LocalApiInfo = "未启动";

        // Build credential items from registry
        ProviderCredentials.Clear();
        foreach (var meta in ProviderRegistry.All)
        {
            var item = new ProviderCredentialItem(meta);
            var fieldKeys = GetVaultKeys(meta.Id);
            if (fieldKeys.Length > 0) item.Value1 = _vault.Get(fieldKeys[0]) ?? "";
            if (fieldKeys.Length > 1) item.Value2 = _vault.Get(fieldKeys[1]) ?? "";
            if (fieldKeys.Length > 2) item.Value3 = _vault.Get(fieldKeys[2]) ?? "";
            if (fieldKeys.Length > 3) item.Value4 = _vault.Get(fieldKeys[3]) ?? "";
            ProviderCredentials.Add(item);
        }
    }

    /// <summary>
    /// Map provider ID + field index to vault key
    /// </summary>
    private static string[] GetVaultKeys(string providerId) => providerId switch
    {
        "microsoft" => new[] { "microsoftApiKey", "microsoftRegion" },
        "amazon" => new[] { "amazonAccessKeyId", "amazonSecretAccessKey", "amazonRegion" },
        "deepl" => new[] { "deeplApiKey" },
        "baidu" => new[] { "baiduAppId", "baiduSecretKey" },
        "alibaba" => new[] { "alibabaAccessKeyId", "alibabaAccessKeySecret" },
        "youdao" => new[] { "youdaoAppId", "youdaoAppSecret" },
        "tencent" => new[] { "tencentSecretId", "tencentSecretKey", "tencentRegion" },
        "niutrans" => new[] { "niutransApiKey" },
        "caiyun" => new[] { "caiyunToken" },
        "volcengine" => new[] { "volcengineAccessKeyId", "volcengineSecretAccessKey", "volcengineRegion" },
        "iflytek" => new[] { "iflytekAppId", "iflytekApiKey", "iflytekApiSecret" },
        _ => Array.Empty<string>()
    };

    [RelayCommand]
    private void SaveAllCredentials()
    {
        foreach (var item in ProviderCredentials)
        {
            var keys = GetVaultKeys(item.Meta.Id);
            if (keys.Length > 0 && !string.IsNullOrWhiteSpace(item.Value1))
                _vault.Set(keys[0], item.Value1);
            if (keys.Length > 1 && !string.IsNullOrWhiteSpace(item.Value2))
                _vault.Set(keys[1], item.Value2);
            if (keys.Length > 2 && !string.IsNullOrWhiteSpace(item.Value3))
                _vault.Set(keys[2], item.Value3);
            if (keys.Length > 3 && !string.IsNullOrWhiteSpace(item.Value4))
                _vault.Set(keys[3], item.Value4);
        }

        // Apply to live providers
        ApplyCredentialsToProviders();
        StatusMessage = "所有凭证已保存并生效";
    }

    private void ApplyCredentialsToProviders()
    {
        try
        {
            var sp = App.Services;
            var vault = _vault;
            var g = (string k) => vault.Get(k) ?? "";

            var ms = sp.GetService<MicrosoftProvider>();
            if (ms != null && !string.IsNullOrEmpty(g("microsoftApiKey")))
                ms.SetCredentials(g("microsoftApiKey"), g("microsoftRegion"));

            var deepl = sp.GetService<DeepLProvider>();
            if (deepl != null && !string.IsNullOrEmpty(g("deeplApiKey")))
                deepl.SetApiKey(g("deeplApiKey"));

            var bd = sp.GetService<BaiduProvider>();
            if (bd != null && !string.IsNullOrEmpty(g("baiduAppId")))
                bd.SetCredentials(g("baiduAppId"), g("baiduSecretKey"));

            var ali = sp.GetService<AlibabaProvider>();
            if (ali != null && !string.IsNullOrEmpty(g("alibabaAccessKeyId")))
                ali.SetCredentials(g("alibabaAccessKeyId"), g("alibabaAccessKeySecret"));

            var yd = sp.GetService<YoudaoProvider>();
            if (yd != null && !string.IsNullOrEmpty(g("youdaoAppId")))
                yd.SetCredentials(g("youdaoAppId"), g("youdaoAppSecret"));

            var tx = sp.GetService<TencentProvider>();
            if (tx != null && !string.IsNullOrEmpty(g("tencentSecretId")))
                tx.SetCredentials(g("tencentSecretId"), g("tencentSecretKey"), g("tencentRegion"));

            var nt = sp.GetService<NiutransProvider>();
            if (nt != null && !string.IsNullOrEmpty(g("niutransApiKey")))
                nt.SetApiKey(g("niutransApiKey"));

            var cy = sp.GetService<CaiyunProvider>();
            if (cy != null && !string.IsNullOrEmpty(g("caiyunToken")))
                cy.SetToken(g("caiyunToken"));

            var ve = sp.GetService<VolcEngineProvider>();
            if (ve != null && !string.IsNullOrEmpty(g("volcengineAccessKeyId")))
                ve.SetCredentials(g("volcengineAccessKeyId"), g("volcengineSecretAccessKey"), g("volcengineRegion"));

            var ifly = sp.GetService<IFlytekProvider>();
            if (ifly != null && !string.IsNullOrEmpty(g("iflytekAppId")))
                ifly.SetCredentials(g("iflytekAppId"), g("iflytekApiKey"), g("iflytekApiSecret"));

            var aws = sp.GetService<AmazonProvider>();
            if (aws != null && !string.IsNullOrEmpty(g("amazonAccessKeyId")))
                aws.SetCredentials(g("amazonAccessKeyId"), g("amazonSecretAccessKey"), g("amazonRegion"));
        }
        catch { /* Non-critical */ }
    }

    [RelayCommand]
    private void SaveTheme()
    {
        _settingsRepo.SetSetting("theme", Theme);
        App.SwitchTheme(Theme);
        StatusMessage = $"主题已切换为: {Theme}";
    }

    [RelayCommand]
    private void ClearAllData()
    {
        _historyRepo.ClearAll();
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
                UpdateStatus = $"发现新版本 v{info.Version}";
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
