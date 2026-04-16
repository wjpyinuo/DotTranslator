import type { TranslationProvider, TranslateParams, TranslateResult, LanguageDetection, UsageStats } from '@shared/types';

/**
 * 免费翻译提供者 - 使用 MyMemory API（无需 API Key）
 * 每日 5000 词免费额度，匿名用户 1000 词
 */
export class FallbackProvider implements TranslationProvider {
  readonly id = 'fallback';
  readonly name = '免费翻译';
  readonly maxTextLength = 5000;
  readonly requiresApiKey = false;
  readonly supportedLanguages = [
    { source: 'auto', target: 'zh' },
    { source: 'auto', target: 'en' },
    { source: 'zh', target: 'en' },
    { source: 'en', target: 'zh' },
    { source: 'ja', target: 'zh' },
    { source: 'zh', target: 'ja' },
    { source: 'ko', target: 'zh' },
    { source: 'zh', target: 'ko' },
    { source: 'fr', target: 'zh' },
    { source: 'zh', target: 'fr' },
    { source: 'de', target: 'zh' },
    { source: 'zh', target: 'de' },
    { source: 'es', target: 'zh' },
    { source: 'zh', target: 'es' },
    { source: 'ru', target: 'zh' },
    { source: 'zh', target: 'ru' },
  ];

  async translate(params: TranslateParams): Promise<TranslateResult> {
    const start = Date.now();
    const src = this.mapLang(params.sourceLang);
    const tgt = this.mapLang(params.targetLang);

    // MyMemory 格式: langpair = src|tgt
    const langpair = `${src}|${tgt}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(params.text)}&langpair=${langpair}`;

    const res = await fetch(url, { signal: params.signal });
    if (!res.ok) throw new Error(`免费翻译服务错误: ${res.status}`);

    const data = await res.json();

    if (data.responseStatus === 429) {
      throw new Error('免费翻译今日额度已用完，请配置 API Key');
    }

    if (data.responseStatus !== 200 && data.responseStatus !== '200') {
      throw new Error(data.responseDetails || '翻译失败');
    }

    const translatedText = data.responseData?.translatedText || '';

    // MyMemory 的 match 值表示翻译匹配度 (0-1)
    const match = data.responseData?.match ?? 0.5;

    return {
      text: translatedText,
      detectedSourceLang: data.responseData?.detectedLanguage || src,
      provider: this.id,
      confidence: Math.min(match, 0.9),
      latencyMs: Date.now() - start,
    };
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    try {
      const result = await this.translate({ text, sourceLang: 'auto', targetLang: 'en' });
      return {
        language: result.detectedSourceLang || 'en',
        confidence: 0.7,
      };
    } catch {
      return { language: 'en', confidence: 0.5 };
    }
  }

  async isAvailable(): Promise<boolean> {
    // 免费 API 始终可用（除非额度用完）
    return true;
  }

  async getUsageStats(): Promise<UsageStats> {
    return { totalCalls: 0, totalChars: 0 };
  }

  private mapLang(code: string): string {
    const map: Record<string, string> = {
      auto: 'auto',
      zh: 'zh-CN',
      en: 'en-GB',
      ja: 'ja-JP',
      ko: 'ko-KR',
      fr: 'fr-FR',
      de: 'de-DE',
      es: 'es-ES',
      ru: 'ru-RU',
      pt: 'pt-BR',
      it: 'it-IT',
    };
    return map[code] || code;
  }
}
