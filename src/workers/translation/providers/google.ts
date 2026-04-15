import type { TranslationProvider, TranslateParams, TranslateResult, LanguageDetection, UsageStats } from '@shared/types';
import { PROVIDER_GOOGLE } from '@shared/constants';

export class GoogleProvider implements TranslationProvider {
  readonly id = PROVIDER_GOOGLE;
  readonly name = 'Google';
  readonly maxTextLength = 30000;
  readonly requiresApiKey = false;
  readonly supportedLanguages = [
    { source: 'auto', target: 'zh' },
    { source: 'auto', target: 'en' },
    { source: 'zh', target: 'en' },
    { source: 'en', target: 'zh' },
  ];

  async translate(params: TranslateParams): Promise<TranslateResult> {
    const start = Date.now();
    const sl = params.sourceLang === 'auto' ? 'auto' : params.sourceLang;
    const tl = params.targetLang;

    // 使用非官方 API（可能随时失效，做好异常处理）
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(params.text)}`;

    try {
      const res = await fetch(url);
      if (res.status === 429) {
        throw new Error('Google Translate rate limited');
      }
      if (!res.ok) {
        throw new Error(`Google Translate error: ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error('Google Translate: unexpected response format');
      }

      const text = data[0].map((item: string[]) => item[0]).join('');
      const detectedLang = data[2] || sl;

      return {
        text,
        detectedSourceLang: detectedLang,
        provider: this.id,
        confidence: 0.9,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes('Google Translate')) throw err;
      throw new Error(`Google Translate failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    const result = await this.translate({ text, sourceLang: 'auto', targetLang: 'en' });
    return {
      language: result.detectedSourceLang || 'en',
      confidence: 0.85,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=hello');
      return res.ok;
    } catch {
      return false;
    }
  }

  async getUsageStats(): Promise<UsageStats> {
    return { totalCalls: 0, totalChars: 0 };
  }
}
