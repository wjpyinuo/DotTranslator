import { SUPPORTED_LANGUAGES, DEBOUNCE_TRANSLATE_MS } from '@shared/constants';
import { useAppStore } from '@renderer/stores/appStore';
import { useCallback, useRef } from 'react';

export function InputArea() {
  const { inputText, sourceLang, targetLang, setInputText, setSourceLang, setTargetLang, swapLanguages, setTranslating, setResults } = useAppStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleInput = useCallback((text: string) => {
    setInputText(text);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setTranslating(true);
      try {
        const { sourceLang: src, targetLang: tgt, settings } = useAppStore.getState();
        const results = await window.electronAPI.translation.translate({
          text,
          sourceLang: src,
          targetLang: tgt,
          enabledProviders: settings.enabledProviders,
        });
        setResults(results);
      } catch (err) {
        console.error('Translation failed:', err);
        setResults([]);
      } finally {
        setTranslating(false);
      }
    }, DEBOUNCE_TRANSLATE_MS);
  }, [setInputText, setResults, setTranslating]);

  return (
    <div className="input-area">
      {/* 语言选择栏 */}
      <div className="lang-bar">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="lang-select"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>

        <button onClick={swapLanguages} className="swap-btn" title="交换语言">
          ⇄
        </button>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="lang-select"
        >
          {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>

      {/* 输入框 */}
      <textarea
        value={inputText}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="输入或粘贴要翻译的文本..."
        className="input-textarea"
        autoFocus
      />
    </div>
  );
}
