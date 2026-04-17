using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation.Providers;

public class FallbackProvider : ITranslationProvider
{
    public string Id => "fallback";
    public string Name => "Fallback";
    public bool RequiresApiKey => false;
    public int MaxTextLength => 10_000;

    public Task<TranslateResult> TranslateAsync(TranslateParams parameters)
    {
        var start = Environment.TickCount64;
        var result = new TranslateResult(
            Id,
            $"[未配置翻译引擎] {parameters.Text}",
            parameters.SourceLang,
            parameters.TargetLang,
            Environment.TickCount64 - start);
        return Task.FromResult(result);
    }

    public Task<bool> IsAvailableAsync() => Task.FromResult(true);

    public Task<LanguageDetection> DetectLanguageAsync(string text)
    {
        var hasChinese = text.Any(c => c >= 0x4E00 && c <= 0x9FFF);
        return Task.FromResult(new LanguageDetection(hasChinese ? "zh" : "en", 0.3));
    }
}
