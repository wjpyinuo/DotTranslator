import { SUPPORTED_LANGUAGES } from '@shared/constants';
import { useAppStore } from '@renderer/stores/appStore';
import { useCallback, useState } from 'react';
import { DEBOUNCE_TRANSLATE_MS } from '@shared/constants';

export function InputArea() {
  const { inputText, sourceLang, targetLang, setInputText, setSourceLang, setTargetLang, swapLanguages, setTranslating, setResults } = useAppStore();
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();

  const handleInput = useCallback((text: string) => {
    setInputText(text);

    if (timer) clearTimeout(timer);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    const newTimer = setTimeout(async () => {
      setTranslating(true);
      try {
        // TODO: 调用翻译 router
        // const results = await translationRouter.translateCompare({ text, sourceLang, targetLang }, enabledProviders);
        // setResults(results);
      } finally {
        setTranslating(false);
      }
    }, DEBOUNCE_TRANSLATE_MS);

    setTimer(newTimer);
  }, [sourceLang, targetLang]);

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
