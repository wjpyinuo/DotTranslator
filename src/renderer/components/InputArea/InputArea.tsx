import { SUPPORTED_LANGUAGES, DEBOUNCE_TRANSLATE_MS } from '@shared/constants';
import { useAppStore } from '@renderer/stores/appStore';
import { useCallback, useRef } from 'react';
import type { TranslateResult } from '@shared/types';

// 检测文本是否包含中文字符
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

export function InputArea() {
  const {
    inputText, sourceLang, targetLang,
    setInputText, setSourceLang, setTargetLang,
    swapLanguages, setTranslating, setResults,
  } = useAppStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doTranslate = useCallback(async () => {
    const text = useAppStore.getState().inputText;
    if (!text.trim()) return;

    setTranslating(true);
    try {
      const { sourceLang: src, targetLang: tgt, settings } = useAppStore.getState();
      const api = window.electronAPI;
      if (!api) {
        console.error('electronAPI not available');
        return;
      }

      // TM 精确匹配查询
      try {
        const tmResult = await api.tm.lookup(text.trim(), src, tgt);
        if (tmResult && typeof tmResult === 'object' && 'targetText' in tmResult) {
          // TM 命中，直接返回
          setResults([{
            text: (tmResult as any).targetText,
            provider: 'tm-cache',
            confidence: 1,
            latencyMs: 1,
          } as TranslateResult]);
          setTranslating(false);
          return;
        }
      } catch { /* TM 未命中，继续正常翻译 */ }

      const results = await api.translation.translate({
        text,
        sourceLang: src,
        targetLang: tgt,
        enabledProviders: settings.enabledProviders,
      });
      setResults(results as TranslateResult[]);

      // 非无痕模式 → 写入历史 + TM 缓存
      if (!settings.privacyMode && results.length > 0) {
        const best = (results as TranslateResult[])[0];
        useAppStore.getState().addToHistory({
          id: crypto.randomUUID(),
          sourceText: text,
          targetText: best.text,
          sourceLang: src,
          targetLang: tgt,
          provider: best.provider,
          isFavorite: false,
          createdAt: Date.now(),
        });

        // 写入 TM 缓存
        try {
          await api.tm.insert(text.trim(), best.text, src, tgt);
        } catch { /* 静默 */ }
      }
    } catch (err) {
      console.error('Translation failed:', err);
      setResults([]);
    } finally {
      setTranslating(false);
    }
  }, [setResults, setTranslating]);

  const handleInput = useCallback((text: string) => {
    setInputText(text);

    // 自动语言判断：如果输入非中文，目标语言自动设为中文
    if (text.trim() && !containsChinese(text)) {
      const curTarget = useAppStore.getState().targetLang;
      if (curTarget !== 'zh') {
        setTargetLang('zh');
      }
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(() => {
      doTranslate();
    }, DEBOUNCE_TRANSLATE_MS);
  }, [setInputText, setResults, setTargetLang, doTranslate]);

  // 切换目标语言后自动翻译
  const handleTargetLangChange = useCallback((lang: string) => {
    setTargetLang(lang);
    if (useAppStore.getState().inputText.trim()) {
      setTimeout(() => doTranslate(), 50);
    }
  }, [setTargetLang, doTranslate]);

  return (
    <div className="input-area">
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
          onChange={(e) => handleTargetLangChange(e.target.value)}
          className="lang-select"
        >
          {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>

      <textarea
        value={inputText}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="输入或粘贴要翻译的文本..."
        className="input-textarea"
        autoFocus
      />

      <button
        className="translate-btn"
        onClick={doTranslate}
        disabled={!inputText.trim()}
      >
        翻 译
      </button>
    </div>
  );
}
