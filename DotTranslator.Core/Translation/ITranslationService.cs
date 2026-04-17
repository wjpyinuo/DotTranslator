using DotTranslator.Shared.Models;

namespace DotTranslator.Core.Translation;

/// <summary>
/// 翻译服务抽象，供 Infrastructure 和 UI 层消费。
/// 隐藏 TranslationRouter 的具体实现细节。
/// </summary>
public interface ITranslationService
{
    ITranslationProvider? GetProvider(string id);
    IReadOnlyList<ITranslationProvider> GetAllProviders();
    Task<TranslateResult> TranslateAsync(string providerId, TranslateParams parameters);
    Task<CompareResult> TranslateCompareAsync(TranslateParams parameters, IEnumerable<string> enabledProviderIds);
    Task<TranslateResult> SmartRouteAsync(TranslateParams parameters, IEnumerable<string> enabledProviderIds);
    IReadOnlyDictionary<string, double> GetErrorRates();
    IReadOnlyList<PersistedCircuit> ExportCircuitStates();
}
