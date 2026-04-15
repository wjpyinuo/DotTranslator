import { useAppStore } from '@renderer/stores/appStore';

export function TranslationPanel() {
  const { results, isTranslating } = useAppStore();

  if (isTranslating) {
    return (
      <div className="translation-panel loading">
        <div className="spinner" />
        <p>翻译中...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="translation-panel empty">
        <p className="empty-hint">输入文本后，翻译结果将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="translation-panel">
      {results.map((result, i) => (
        <div key={i} className="translation-result">
          <div className="translation-header">
            <span className="provider-badge">{result.provider}</span>
            {result.confidence < 1 && (
              <span className="confidence-badge">{Math.round(result.confidence * 100)}%</span>
            )}
          </div>
          <div className="translation-text">{result.text}</div>
        </div>
      ))}
    </div>
  );
}
