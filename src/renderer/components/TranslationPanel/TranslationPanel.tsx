import { useAppStore } from '@renderer/stores/appStore';
import type { TranslateResult } from '@shared/types';

export function TranslationPanel() {
  const { results, isTranslating } = useAppStore();

  if (isTranslating) {
    return (
      <div className="translation-panel">
        <div className="loading-indicator">
          <div className="spinner" />
          <span>翻译中...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="translation-panel">
      {results.length === 1 ? (
        <SingleResult result={results[0]} />
      ) : (
        <CompareResults results={results} />
      )}
    </div>
  );
}

function SingleResult({ result }: { result: TranslateResult }) {
  return (
    <div className="result-card">
      <div className="result-header">
        <span className="provider-badge">{result.provider}</span>
        <span className="confidence">⭐ {Math.round(result.confidence * 100)}%</span>
        <span className="latency">{result.latencyMs}ms</span>
      </div>
      <div className="result-text">{result.text}</div>
      <div className="result-actions">
        <button className="action-btn" onClick={() => navigator.clipboard.writeText(result.text)}>
          📋 复制
        </button>
      </div>
    </div>
  );
}

function CompareResults({ results }: { results: TranslateResult[] }) {
  return (
    <div className="compare-results">
      <div className="compare-header">翻译对比</div>
      <div className="compare-grid">
        {results.map((result) => (
          <div key={result.provider} className="result-card">
            <div className="result-header">
              <span className="provider-badge">{result.provider}</span>
              <span className="confidence">⭐ {Math.round(result.confidence * 100)}%</span>
              <span className="latency">{result.latencyMs}ms</span>
            </div>
            <div className="result-text">{result.text}</div>
            <div className="result-actions">
              <button className="action-btn" onClick={() => navigator.clipboard.writeText(result.text)}>
                📋 复制
              </button>
              <button className="action-btn adopt-btn">
                ✅ 采用此翻译
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
