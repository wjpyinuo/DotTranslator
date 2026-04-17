using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation;

public interface ITranslationProvider
{
    string Id { get; }
    string Name { get; }
    bool RequiresApiKey { get; }
    int MaxTextLength { get; }

    Task<TranslateResult> TranslateAsync(TranslateParams parameters);
    Task<bool> IsAvailableAsync();
    Task<LanguageDetection> DetectLanguageAsync(string text);
}

public record LanguageDetection(string Language, double Confidence);
