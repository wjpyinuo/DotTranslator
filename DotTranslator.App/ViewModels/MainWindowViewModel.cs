using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DotTranslator.Core.Translation;
using DotTranslator.Core.History;
using DotTranslator.Core.Telemetry;
using DotTranslator.Infrastructure.Data;
using DotTranslator.App.Platform.Windows;
using DotTranslator.Shared.Models;
using DotTranslator.Shared.Constants;
using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace DotTranslator.App.ViewModels;

public partial class MainWindowViewModel : ObservableObject
{
    private readonly TranslationRouter _router;
    private readonly HistoryService _historyService;
    private readonly TelemetryReporter _telemetry;
    private readonly SqliteRepository _repo;
    private GlobalClipboard? _clipboard;

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
        TelemetryReporter telemetry,
        SqliteRepository repo,
        HistoryViewModel historyViewModel,
        SettingsViewModel settingsViewModel)
    {
        _router = router;
        _historyService = historyService;
        _telemetry = telemetry;
        _repo = repo;
        History = historyViewModel;
        Settings = settingsViewModel;

        LoadProviders();
        LoadRecentHistory();
        InitClipboardMonitor();
    }

    private void InitClipboardMonitor()
    {
        if (!OperatingSystem.IsWindows()) return;

        _clipboard = new GlobalClipboard();
        _clipboard.TextChanged += OnClipboardTextChanged;
        _clipboard.Start();
    }

    private async void OnClipboardTextChanged(string text)
    {
        if (!ClipboardMonitorEnabled) return;
        if (string.IsNullOrWhiteSpace(text) || text.Length > AppConstants.MaxTranslationLength) return;

        // Switch to translate tab and fill source
        SelectedTab = "translate";
        SourceText = text;
        await TranslateAsync();
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
            // 1. Check TM cache first
            var tmHit = _historyService.LookupTM(SourceLang, TargetLang, SourceText);
            if (tmHit != null)
            {
                TranslatedText = tmHit.TargetText;
                TranslationResults.Add(new TranslateResult(
                    "tm-cache", tmHit.TargetText, SourceLang, TargetLang, 0, FromCache: true));
                StatusMessage = $"翻译完成 (缓存命中, 已用 {tmHit.UsageCount} 次)";

                // Record stat
                _repo.RecordStat(new LocalStatsRecord(
                    Guid.NewGuid().ToString(), FeatureNames.TranslateManual,
                    "tm-cache", SourceLang, TargetLang, SourceText.Length, 0, true, DateTime.UtcNow));
                _repo.RecordProviderMetric("tm-cache", true, 0);

                _historyService.AddEntry(SourceText, TranslatedText, SourceLang, TargetLang, "tm-cache");
                LoadRecentHistory();
                History.Refresh();
                IsTranslating = false;
                return;
            }

            // 2. Get available providers
            var providerIds = _router.GetAllProviders()
                .Where(p => p.Id != "fallback")
                .Select(p => p.Id)
                .ToList();

            // Filter to only those with credentials / available
            var availableIds = new List<string>();
            foreach (var id in providerIds)
            {
                var provider = _router.GetProvider(id);
                if (provider != null && await provider.IsAvailableAsync())
                    availableIds.Add(id);
            }
            if (availableIds.Count == 0) availableIds.Add("fallback");

            // 3. Translate with timing
            var sw = Stopwatch.StartNew();
            var parameters = new TranslateParams(SourceText, SourceLang, TargetLang);
            var result = await _router.TranslateCompareAsync(parameters, availableIds);
            sw.Stop();

            foreach (var r in result.Results)
            {
                TranslationResults.Add(r);
                // Record provider metric
                _repo.RecordProviderMetric(r.Provider, true, r.LatencyMs);
            }
            foreach (var e in result.Errors)
            {
                _repo.RecordProviderMetric(e.ProviderId, false, 0);
            }

            if (result.Results.Count > 0)
            {
                TranslatedText = result.Results[0].TranslatedText;
                var provider = result.Results[0].Provider;

                // Save to history + TM
                _historyService.AddEntry(SourceText, TranslatedText, SourceLang, TargetLang, provider);
                LoadRecentHistory();
                History.Refresh();

                // Record telemetry + stats
                _telemetry.RecordTranslation(new TranslationDetail(
                    provider, SourceLang, TargetLang, SourceText.Length, sw.ElapsedMilliseconds, true));
                _repo.RecordStat(new LocalStatsRecord(
                    Guid.NewGuid().ToString(), FeatureNames.TranslateManual,
                    provider, SourceLang, TargetLang, SourceText.Length, sw.ElapsedMilliseconds, false, DateTime.UtcNow));
            }

            StatusMessage = result.Results.Count > 0
                ? $"翻译完成 ({result.Results.Count} 个引擎, {sw.ElapsedMilliseconds}ms)"
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
        if (_clipboard != null) _clipboard.Enabled = ClipboardMonitorEnabled;
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
