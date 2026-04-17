using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DotTranslator.Core.Translation;
using DotTranslator.Shared.Models;
using System.Threading.Tasks;

namespace DotTranslator.App.ViewModels;

public partial class TranslationViewModel : ObservableObject
{
    private readonly TranslationRouter _router;

    [ObservableProperty] private string _text = string.Empty;
    [ObservableProperty] private string _result = string.Empty;
    [ObservableProperty] private string _sourceLang = "auto";
    [ObservableProperty] private string _targetLang = "zh";
    [ObservableProperty] private bool _isTranslating;
    [ObservableProperty] private string _statusMessage = string.Empty;

    public TranslationViewModel(TranslationRouter router)
    {
        _router = router;
    }

    [RelayCommand]
    private async Task TranslateAsync()
    {
        if (string.IsNullOrWhiteSpace(Text)) return;

        IsTranslating = true;
        StatusMessage = "翻译中...";

        try
        {
            var parameters = new TranslateParams(Text, SourceLang, TargetLang);
            var result = await _router.SmartRouteAsync(parameters, new[] { "fallback" });
            Result = result.TranslatedText;
            StatusMessage = $"翻译完成 ({result.LatencyMs}ms)";
        }
        catch (System.Exception ex)
        {
            StatusMessage = $"翻译失败: {ex.Message}";
        }
        finally
        {
            IsTranslating = false;
        }
    }
}
