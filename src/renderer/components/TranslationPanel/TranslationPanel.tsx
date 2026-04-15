import { useAppStore } from '../../stores/appStore';

export function TranslationPanel() {
  const { translation, isLoading } = useAppStore();

  if (isLoading) {
    return (
      <div className="translation-panel loading">
        <div className="spinner" />
        <p>翻译中...</p>
      </div>
    );
  }

  if (!translation) {
    return (
      <div className="translation-panel empty">
        <p className="empty-hint">输入文本后，翻译结果将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="translation-panel">
      <div className="translation-header">
        <span className="lang-badge">{translation.targetLang}</span>
        <span className="provider-badge">{translation.provider}</span>
      </div>
      <div className="translation-result">
        {translation.text}
      </div>
      {translation.tmHit && (
        <div className="tm-badge">📎 翻译记忆匹配</div>
      )}
    </div>
  );
}

