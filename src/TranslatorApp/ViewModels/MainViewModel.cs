using System.Collections.ObjectModel;
using System.IO;
using System.Text.Json;
using Avalonia.Platform;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace TranslatorApp.ViewModels;

/// <summary>
/// 主窗口 ViewModel — 完整属性清单。
/// 所有 ObservableProperty 由 CommunityToolkit.Mvvm 源生成器自动生成 INotifyPropertyChanged。
/// </summary>
public partial class MainViewModel : ViewModelBase
{
    // ═══════════════════════════════════════════
    //  侧边栏导航
    // ═══════════════════════════════════════════

    /// <summary>左侧工作流页签（翻译/收藏/历史）</summary>
    public ObservableCollection<NavigationItem> LeftNavItems { get; } = new()
    {
        new("translate", "🌍", "翻译"),
        new("favorites", "⭐", "收藏"),
        new("history",   "📋", "历史"),
    };

    /// <summary>右侧配置页签（设置/关于/打赏）</summary>
    public ObservableCollection<NavigationItem> RightNavItems { get; } = new()
    {
        new("settings", "⚙️", "设置"),
        new("about",    "ℹ️", "关于"),
        new("donate",   "☕", "打赏"),
    };

    /// <summary>当前选中的页面 Key</summary>
    [ObservableProperty]
    private string _selectedPage = "translate";

    /// <summary>页面可见性计算属性</summary>
    public bool IsTranslatePage => SelectedPage == "translate";
    public bool IsFavoritesPage => SelectedPage == "favorites";
    public bool IsHistoryPage   => SelectedPage == "history";
    public bool IsSettingsPage  => SelectedPage == "settings";
    public bool IsAboutPage     => SelectedPage == "about";
    public bool IsDonatePage    => SelectedPage == "donate";

    // ═══════════════════════════════════════════
    //  语言选择
    // ═══════════════════════════════════════════

    /// <summary>可用语言列表（从 languages.json 加载）</summary>
    [ObservableProperty]
    private ObservableCollection<LanguageItem> _availableLanguages = new();

    /// <summary>当前选中的源语言</summary>
    [ObservableProperty]
    private LanguageItem _selectedSourceLang = new("auto", "自动检测");

    /// <summary>当前选中的目标语言</summary>
    [ObservableProperty]
    private LanguageItem _selectedTargetLang = new("en", "英语");

    /// <summary>自动检测到的源语言显示文本</summary>
    [ObservableProperty]
    private string _detectedLangHint = string.Empty;

    // ═══════════════════════════════════════════
    //  输入
    // ═══════════════════════════════════════════

    /// <summary>用户输入的源文本</summary>
    [ObservableProperty]
    private string _sourceText = string.Empty;

    // ═══════════════════════════════════════════
    //  翻译结果
    // ═══════════════════════════════════════════

    /// <summary>译文</summary>
    [ObservableProperty]
    private string _translatedText = string.Empty;

    /// <summary>当前使用的引擎名称</summary>
    [ObservableProperty]
    private string _engineName = string.Empty;

    /// <summary>翻译耗时（毫秒）</summary>
    [ObservableProperty]
    private int _latencyMs;

    /// <summary>是否正在翻译</summary>
    [ObservableProperty]
    private bool _isLoading;

    /// <summary>翻译错误（null = 无错误）</summary>
    [ObservableProperty]
    private TranslationErrorViewModel? _error;

    /// <summary>是否已收藏当前译文</summary>
    [ObservableProperty]
    private bool _isFavorite;

    /// <summary>复制按钮是否显示"已复制"状态</summary>
    [ObservableProperty]
    private bool _copySuccess;

    // ═══════════════════════════════════════════
    //  模式
    // ═══════════════════════════════════════════

    /// <summary>当前翻译模式：normal / ai</summary>
    [ObservableProperty]
    private string _currentMode = "normal";

    /// <summary>是否为 AI 模式</summary>
    public bool IsAiMode => CurrentMode == "ai";

    // ═══════════════════════════════════════════
    //  主题
    // ═══════════════════════════════════════════

    /// <summary>是否为深色主题</summary>
    [ObservableProperty]
    private bool _isDarkTheme;

    /// <summary>是否窗口置顶</summary>
    [ObservableProperty]
    private bool _isPinned;

    // ═══════════════════════════════════════════
    //  公告栏
    // ═══════════════════════════════════════════

    /// <summary>公告栏文本</summary>
    [ObservableProperty]
    private string _announcementText = "DotTranslator v1.0.0 — 轻量、免费、多引擎聚合翻译工具";

    // ═══════════════════════════════════════════
    //  收藏列表（占位）
    // ═══════════════════════════════════════════

    /// <summary>收藏列表</summary>
    [ObservableProperty]
    private ObservableCollection<FavoriteItem> _favorites = new();

    // ═══════════════════════════════════════════
    //  历史列表（占位）
    // ═══════════════════════════════════════════

    /// <summary>翻译历史列表</summary>
    [ObservableProperty]
    private ObservableCollection<HistoryItem> _historyItems = new();

    // ═══════════════════════════════════════════
    //  初始化
    // ═══════════════════════════════════════════

    /// <summary>从嵌入资源加载语言列表</summary>
    public void Initialize()
    {
        try
        {
            var asset = AssetLoader.Open(new Uri("avares://DotTranslator/Assets/languages.json"));
            using var reader = new StreamReader(asset);
            var json = reader.ReadToEnd();
            var doc = JsonDocument.Parse(json);
            var items = doc.RootElement.GetProperty("languages");
            var list = new ObservableCollection<LanguageItem>();
            foreach (var lang in items.EnumerateArray())
            {
                list.Add(new LanguageItem(
                    lang.GetProperty("code").GetString()!,
                    lang.GetProperty("name").GetString()!));
            }
            AvailableLanguages = list;
        }
        catch
        {
            // 降级：保留默认空列表
        }

        // 默认选中翻译页
        SelectPage("translate");
    }

    // ═══════════════════════════════════════════
    //  计算属性
    // ═══════════════════════════════════════════

    /// <summary>是否有翻译结果</summary>
    public bool HasResult =>
        !string.IsNullOrEmpty(TranslatedText) && !IsLoading && Error == null;

    /// <summary>耗时显示文本</summary>
    public string LatencyDisplay => $"⚡ {LatencyMs}ms";

    /// <summary>译文字数显示</summary>
    public string CharCountDisplay => $"{TranslatedText.Length} 字";

    // ═══════════════════════════════════════════
    //  命令
    // ═══════════════════════════════════════════

    [RelayCommand]
    private async Task TranslateAsync()
    {
        if (string.IsNullOrWhiteSpace(SourceText)) return;

        IsLoading = true;
        Error = null;
        TranslatedText = string.Empty;

        try
        {
            // TODO: 调用 TranslationManager.TranslateAsync()
            await Task.Delay(300);
            TranslatedText = "（翻译功能待实现 — Week 2 将接入真实引擎）";
            EngineName = "Mock";
            LatencyMs = 300;
        }
        catch (Exception ex)
        {
            Error = TranslationErrorViewModel.FromException(ex);
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    private void SwapLanguages()
    {
        if (SelectedSourceLang.Code == "auto") return;
        (SelectedSourceLang, SelectedTargetLang) = (SelectedTargetLang, SelectedSourceLang);
    }

    [RelayCommand]
    private async Task CopyAsync()
    {
        if (string.IsNullOrEmpty(TranslatedText)) return;

        CopySuccess = true;
        await Task.Delay(2000);
        CopySuccess = false;
    }

    [RelayCommand]
    private async Task SpeakAsync()
    {
        if (string.IsNullOrEmpty(TranslatedText)) return;
        // TODO: 调用 TtsService.SpeakAsync()
        await Task.CompletedTask;
    }

    [RelayCommand]
    private void ToggleFavorite()
    {
        IsFavorite = !IsFavorite;
        // TODO: 写入 SQLite
    }

    [RelayCommand]
    private static void Compare()
    {
        // TODO: 展开多引擎对比视图
    }

    [RelayCommand]
    private void ToggleTheme()
    {
        IsDarkTheme = !IsDarkTheme;
        Assets.Themes.Colors.ApplyTheme(IsDarkTheme);
    }

    [RelayCommand]
    private void TogglePin()
    {
        IsPinned = !IsPinned;
        // TODO: 设置窗口 Topmost
    }

    /// <summary>导航到指定页面</summary>
    public void SelectPage(string pageKey)
    {
        SelectedPage = pageKey;

        // 更新所有导航项的选中状态
        foreach (var item in LeftNavItems)
            item.IsSelected = item.Key == pageKey;
        foreach (var item in RightNavItems)
            item.IsSelected = item.Key == pageKey;

        // 通知页面可见性变更
        OnPropertyChanged(nameof(IsTranslatePage));
        OnPropertyChanged(nameof(IsFavoritesPage));
        OnPropertyChanged(nameof(IsHistoryPage));
        OnPropertyChanged(nameof(IsSettingsPage));
        OnPropertyChanged(nameof(IsAboutPage));
        OnPropertyChanged(nameof(IsDonatePage));
    }

    [RelayCommand]
    private void Navigate(string? pageKey)
    {
        if (!string.IsNullOrEmpty(pageKey))
            SelectPage(pageKey);
    }

    // ═══════════════════════════════════════════
    //  属性变更联动
    // ═══════════════════════════════════════════

    partial void OnTranslatedTextChanged(string value)
    {
        OnPropertyChanged(nameof(HasResult));
        OnPropertyChanged(nameof(CharCountDisplay));
    }

    partial void OnIsLoadingChanged(bool value)
    {
        OnPropertyChanged(nameof(HasResult));
    }

    partial void OnErrorChanged(TranslationErrorViewModel? value)
    {
        OnPropertyChanged(nameof(HasResult));
    }

    partial void OnLatencyMsChanged(int value)
    {
        OnPropertyChanged(nameof(LatencyDisplay));
    }

    partial void OnCurrentModeChanged(string value)
    {
        OnPropertyChanged(nameof(IsAiMode));
    }
}

// ═══════════════════════════════════════════
//  辅助类型
// ═══════════════════════════════════════════

/// <summary>语言项（用于 ComboBox 绑定）</summary>
public record LanguageItem(string Code, string Name);

/// <summary>翻译错误 ViewModel</summary>
public partial class TranslationErrorViewModel : ObservableObject
{
    [ObservableProperty]
    private string _errorType = string.Empty;

    [ObservableProperty]
    private string _message = string.Empty;

    [ObservableProperty]
    private string _suggestion = string.Empty;

    public static TranslationErrorViewModel FromException(Exception ex) => new()
    {
        ErrorType = ex switch
        {
            TimeoutException => "Timeout",
            HttpRequestException => "Network",
            _ => "Unknown"
        },
        Message = ex.Message,
        Suggestion = ex switch
        {
            TimeoutException => "请检查网络连接后重试",
            HttpRequestException => "请检查网络连接",
            _ => "请稍后重试"
        }
    };
}

/// <summary>收藏项（占位）</summary>
public partial class FavoriteItem : ObservableObject
{
    [ObservableProperty] private string _sourceText = string.Empty;
    [ObservableProperty] private string _translatedText = string.Empty;
    [ObservableProperty] private string _engineName = string.Empty;
    [ObservableProperty] private string _langPair = string.Empty;
    [ObservableProperty] private DateTime _favoriteTime;
}

/// <summary>历史项（占位）</summary>
public partial class HistoryItem : ObservableObject
{
    [ObservableProperty] private string _sourceText = string.Empty;
    [ObservableProperty] private string _translatedText = string.Empty;
    [ObservableProperty] private string _engineName = string.Empty;
    [ObservableProperty] private string _langPair = string.Empty;
    [ObservableProperty] private int _latencyMs;
    [ObservableProperty] private DateTime _timestamp;
    [ObservableProperty] private bool _isFavorite;
}

/// <summary>ViewModel 基类</summary>
public partial class ViewModelBase : ObservableObject { }
