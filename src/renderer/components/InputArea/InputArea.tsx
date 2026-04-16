import { SUPPORTED_LANGUAGES, DEBOUNCE_TRANSLATE_MS } from '@shared/constants';
import { useAppStore } from '@renderer/stores/appStore';
import { useCallback, useRef } from 'react';
import type { TranslateResult } from '@shared/types';

// 检测文本是否主要为英文
function isEnglish(text: string): boolean {
  const cleaned = text.replace(/[^a-zA-Z\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, '');
  if (!cleaned) return false;
  const engChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  return engChars / cleaned.length > 0.6;
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
            text: (tmResult as { targetText: string }).targetText,
            provider: 'tm-cache',
            confidence: 1,
            latencyMs: 1,
          } as TranslateResult]);
          setTranslating(false);
          return;
        }
      } catch { /* TM 未命中，继续正常翻译 */ }

      // 确保 fallback 兜底翻译始终可用
      const providersWithFallback = settings.enabledProviders.includes('fallback')
        ? settings.enabledProviders
        : [...settings.enabledProviders, 'fallback'];

      const results = await api.translation.translate({
        text,
        sourceLang: src,
        targetLang: tgt,
        enabledProviders: providersWithFallback,
      });

      if (results && (results as TranslateResult[]).length > 0) {
        setResults(results as TranslateResult[]);
      } else {
        // 所有引擎都失败，单独尝试 fallback
        try {
          const fallbackResults = await api.translation.translate({
            text,
            sourceLang: src,
            targetLang: tgt,
            enabledProviders: ['fallback'],
          });
          setResults(fallbackResults as TranslateResult[]);
        } catch {
          setResults([]);
        }
      }

      // 非无痕模式 → 写入历史 + TM 缓存
      if (!settings.privacyMode && results.length > 0) {
        const best = (results as TranslateResult[])[0];
        const entry = {
          id: crypto.randomUUID(),
          sourceText: text,
          targetText: best.text,
          sourceLang: src,
          targetLang: tgt,
          provider: best.provider,
          isFavorite: false,
          createdAt: Date.now(),
        };
        // 写入 Zustand store（当前会话）
        useAppStore.getState().addToHistory(entry);

        // 持久化到 SQLite
        try {
          await api.history.add({
            sourceText: text,
            targetText: best.text,
            sourceLang: src,
            targetLang: tgt,
            provider: best.provider,
          });
        } catch { /* 静默 */ }

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

  // 跟踪用户是否手动交换过语言（防止自动判断覆盖手动操作）
  const userSwappedRef = useRef(false);

  const handleInput = useCallback((text: string) => {
    setInputText(text);

    // 自动语言判断：仅在用户未手动交换时生效
    // 英文输入 → 目标中文；非英文输入 → 目标英文
    if (text.trim() && !userSwappedRef.current) {
      if (isEnglish(text)) {
        if (useAppStore.getState().targetLang !== 'zh') setTargetLang('zh');
      } else {
        if (useAppStore.getState().targetLang !== 'en') setTargetLang('en');
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

  // 交换语言时标记为手动操作
  const handleSwap = useCallback(() => {
    userSwappedRef.current = true;
    swapLanguages();
    // 如果当前有文本，交换后重新翻译
    if (useAppStore.getState().inputText.trim()) {
      setTimeout(() => doTranslate(), 50);
    }
  }, [swapLanguages, doTranslate]);

  return (
    <div className="input-area">
      <div className="lang-bar">
        <select
          value={sourceLang}
          onChange={(e) => {
            userSwappedRef.current = true;
            setSourceLang(e.target.value);
          }}
          className="lang-select"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>

        <button onClick={handleSwap} className="swap-btn" title="交换语言" aria-label="交换语言">
          ↔
        </button>

        <select
          value={targetLang}
          onChange={(e) => {
            userSwappedRef.current = true;
            handleTargetLangChange(e.target.value);
          }}
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
        placeholder="输入或粘贴要翻译的文本...（支持拖拽 .txt 文件）"
        className="input-textarea"
        autoFocus
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('drag-over');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('drag-over');
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over');
          const file = e.dataTransfer.files[0];
          if (!file) return;
          // 仅支持纯文本文件
          if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            const text = await file.text();
            if (text.trim()) {
              handleInput(text.trim());
            }
          }
        }}
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
