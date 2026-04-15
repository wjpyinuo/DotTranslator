import { useAppStore } from '@renderer/stores/appStore';
import { useCallback, useState } from 'react';

// Provider 名称映射
const PROVIDER_NAMES: Record<string, string> = {
  deepl: 'DeepL',
  google: 'Google',
  baidu: '百度翻译',
};

// 简单音标生成（英文 → IPA近似）
function getPhonetic(text: string, lang: string): string | null {
  if (lang === 'en' || lang === 'en-US') {
    // 对于短文本(单词级别)，提供简单音标提示
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
    // 映射语言代码到 BCP 47
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
  const { results, isTranslating, targetLang } = useAppStore();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = useCallback(async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      // fallback
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

  return (
    <div className="translation-panel">
      {results.map((result, i) => {
        const providerName = PROVIDER_NAMES[result.provider] || result.provider;
        const phonetic = getPhonetic(result.text, targetLang);

        return (
          <div key={i} className="translation-result">
            <div className="translation-header">
              <span className="provider-badge">{providerName}</span>
              {result.confidence < 1 && (
                <span className="confidence-badge">
                  {Math.round(result.confidence * 100)}%
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
