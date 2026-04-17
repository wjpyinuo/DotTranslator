using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DotTranslator.Core.Translation;
using DotTranslator.Core.History;
using DotTranslator.Core.Security;
using DotTranslator.Shared.Models;
using DotTranslator.Shared.Constants;
using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace DotTranslator.App.ViewModels;

public partial class MainWindowViewModel : ObservableObject
{
    private readonly TranslationRouter _router;
    private readonly HistoryService _historyService;

    [ObservableProperty] private string _sourceText = string.Empty;
    [ObservableProperty] private string _translatedText = string.Empty;
    [ObservableProperty] private string _sourceLang = "auto";
    [ObservableProperty] private string _targetLang = "zh";
    [ObservableProperty] private bool _isTranslating;
    [ObservableProperty] private string _statusMessage = "就绪";
    [ObservableProperty] private string _currentTheme = "light";
    [ObservableProperty] private bool _clipboardMonitorEnabled = true;
    [ObservableProperty] private string _selectedTab = "translate";

    public ObservableCollection<TranslateResult> TranslationResults { get; } = new();
    public ObservableCollection<ProviderInfo> AvailableProviders { get; } = new();
    public ObservableCollection<HistoryEntry> RecentHistory { get; } = new();

    public HistoryViewModel History { get; }
    public SettingsViewModel Settings { get; }

    public MainWindowViewModel(
        TranslationRouter router,
        HistoryService historyService,
        HistoryViewModel historyViewModel,
        SettingsViewModel settingsViewModel)
    {
        _router = router;
        _historyService = historyService;
        History = historyViewModel;
        Settings = settingsViewModel;

        LoadProviders();
        LoadRecentHistory();
    }

    private void LoadProviders()
    {
        AvailableProviders.Clear();
        foreach (var p in _router.GetAllProviders())
        {
            AvailableProviders.Add(new ProviderInfo(p.Id, p.Name, p.RequiresApiKey));
        }
    }

    private void LoadRecentHistory()
    {
        RecentHistory.Clear();
        foreach (var h in _historyService.GetHistory(20))
        {
            RecentHistory.Add(h);
        }
    }

    [RelayCommand]
    private async Task TranslateAsync()
    {
        if (string.IsNullOrWhiteSpace(SourceText)) return;

        IsTranslating = true;
        StatusMessage = "翻译中...";
        TranslationResults.Clear();

        try
        {
            var parameters = new TranslateParams(SourceText, SourceLang, TargetLang);
            var providerIds = _router.GetAllProviders()
                .Where(p => p.Id != "fallback" && p.Id != "baidu" && p.Id != "youdao" && p.Id != "deepl")
                .Select(p => p.Id)
                .ToList();

            // Include providers that have credentials set
            foreach (var p in _router.GetAllProviders())
            {
                if (p.Id == "fallback") continue;
                if (await p.IsAvailableAsync() && !providerIds.Contains(p.Id))
                    providerIds.Add(p.Id);
            }

            if (providerIds.Count == 0) providerIds.Add("fallback");

            var result = await _router.TranslateCompareAsync(parameters, providerIds);

            foreach (var r in result.Results)
            {
                TranslationResults.Add(r);
            }

            if (result.Results.Count > 0)
            {
                TranslatedText = result.Results[0].TranslatedText;
                _historyService.AddEntry(SourceText, TranslatedText, SourceLang, TargetLang, result.Results[0].Provider);
                LoadRecentHistory();
                History.Refresh();
            }

            StatusMessage = result.Results.Count > 0
                ? $"翻译完成 ({result.Results.Count} 个引擎)"
                : $"翻译失败: {string.Join(", ", result.Errors.Select(e => e.Error))}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"翻译出错: {ex.Message}";
        }
        finally
        {
            IsTranslating = false;
        }
    }

    [RelayCommand]
    private void SwapLanguages()
    {
        if (SourceLang == "auto") return;
        (SourceLang, TargetLang) = (TargetLang, SourceLang);
        (SourceText, TranslatedText) = (TranslatedText, SourceText);
    }

    [RelayCommand]
    private void CopyTranslation()
    {
        if (!string.IsNullOrEmpty(TranslatedText))
        {
            var topLevel = Avalonia.Application.Current?.ApplicationLifetime is
                Avalonia.Controls.ApplicationLifetimes.IClassicDesktopStyleApplicationLifetime desktop
                ? desktop.MainWindow : null;
            if (topLevel != null)
            {
                topLevel.Clipboard?.SetTextAsync(TranslatedText);
                StatusMessage = "已复制到剪贴板";
            }
        }
    }

    [RelayCommand]
    private void ToggleTheme()
    {
        CurrentTheme = CurrentTheme == "light" ? "dark" : "light";
        App.SwitchTheme(CurrentTheme);
    }

    [RelayCommand]
    private void ToggleClipboardMonitor()
    {
        ClipboardMonitorEnabled = !ClipboardMonitorEnabled;
        StatusMessage = ClipboardMonitorEnabled ? "剪贴板监听已开启" : "剪贴板监听已关闭";
    }

    [RelayCommand]
    private void ClearSource()
    {
        SourceText = string.Empty;
        TranslatedText = string.Empty;
        TranslationResults.Clear();
    }

    [RelayCommand]
    private void SelectTab(string? tab)
    {
        if (!string.IsNullOrEmpty(tab))
            SelectedTab = tab;
    }
}
