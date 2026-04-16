import { useAppStore } from '@renderer/stores/appStore';
import { useCallback, useState } from 'react';

// Provider 名称映射
const PROVIDER_NAMES: Record<string, string> = {
  deepl: 'DeepL',
  youdao: '有道翻译',
  baidu: '百度翻译',
};

// Provider 颜色
const PROVIDER_COLORS: Record<string, string> = {
  deepl: '#10b981',
  youdao: '#3b82f6',
  baidu: '#f59e0b',
};

// 简单音标生成（英文 → IPA近似）
function getPhonetic(text: string, lang: string): string | null {
  if (lang === 'en' || lang === 'en-US') {
    const words = text.trim().split(/\s+/);
    if (words.length <= 3 && /^[a-zA-Z\s'-]+$/.test(text.trim())) {
      return `/${text.trim().toLowerCase().replace(/[aeiou]/g, (m) => {
        const map: Record<string, string> = { a: 'æ', e: 'ɛ', i: 'ɪ', o: 'ɔ', u: 'ʊ' };
        return map[m] || m;
      })}/`;
    }
  }
  return null;
}

// 语音朗读
function speak(text: string, lang: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR',
      fr: 'fr-FR', de: 'de-DE', es: 'es-ES', ru: 'ru-RU',
      pt: 'pt-BR', it: 'it-IT',
    };
    utterance.lang = langMap[lang] || lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
}

export function TranslationPanel() {
  const { results, isTranslating, targetLang, sourceLang, inputText } = useAppStore();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [adoptedIdx, setAdoptedIdx] = useState<number | null>(null);

  const handleCopy = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    }
  }, []);

  // 采用此翻译 → 写入 TM 缓存
  const handleAdopt = useCallback(async (idx: number) => {
    setAdoptedIdx(idx);
    const result = results[idx];
    const api = window.electronAPI;
    if (api && inputText.trim() && result?.text) {
      try {
        await api.tm.insert(inputText.trim(), result.text, sourceLang, targetLang);
      } catch { /* 静默 */ }
    }
    setTimeout(() => setAdoptedIdx(null), 2000);
  }, [results, inputText, sourceLang, targetLang]);

  // 悬浮球 - 发送翻译结果到 PiP 窗口
  const handlePip = useCallback((text: string) => {
    window.electronAPI?.pip.show({ text, sourceLang, targetLang });
  }, [sourceLang, targetLang]);

  if (isTranslating) {
    return (
      <div className="translation-panel">
        <div className="loading-indicator">
          <div className="spinner" />
          <p>翻译中...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="translation-panel">
        <p className="empty-hint">输入文本后，翻译结果将显示在这里</p>
      </div>
    );
  }

  const isComparison = results.length > 1;

  return (
    <div className="translation-panel">
      {isComparison && <h3 className="comparison-title">翻译对比</h3>}
      <div className={isComparison ? 'comparison-grid' : ''}>
        {results.map((result, i) => {
          const providerName = PROVIDER_NAMES[result.provider] || result.provider;
          const providerColor = PROVIDER_COLORS[result.provider] || '#6366f1';
          const phonetic = getPhonetic(result.text, targetLang);

          return (
            <div key={i} className="translation-result" style={isComparison ? { borderTopColor: providerColor } : undefined}>
              <div className="translation-header">
                <span className="provider-dot" style={{ background: providerColor }} />
                <span className="provider-badge">{providerName}</span>
                {result.confidence < 1 && (
                  <span className="confidence-badge">
                    ⭐ {Math.round(result.confidence * 100)}%
                  </span>
                )}
                {result.latencyMs > 0 && (
                  <span className="latency-badge">{result.latencyMs}ms</span>
                )}
              </div>

              <div className="translation-text">{result.text}</div>

              {phonetic && (
                <div className="phonetic">{phonetic}</div>
              )}

              <div className="translation-actions">
                <button
                  className="action-btn"
                  onClick={() => speak(result.text, targetLang)}
                  title="语音朗读"
                >
                  🔊 朗读
                </button>
                <button
                  className={`action-btn ${copiedIdx === i ? 'copied' : ''}`}
                  onClick={() => handleCopy(result.text, i)}
                  title="复制翻译结果"
                >
                  {copiedIdx === i ? '✓ 已复制' : '📋 复制'}
                </button>
                {isComparison && (
                  <button
                    className={`action-btn adopt-btn ${adoptedIdx === i ? 'adopted' : ''}`}
                    onClick={() => handleAdopt(i)}
                    title="采用此翻译"
                  >
                    {adoptedIdx === i ? '✅ 已采用' : '👍 采用'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
