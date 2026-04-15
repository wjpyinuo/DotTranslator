import type { TranslationProvider, TranslateParams, TranslateResult, LanguageDetection, UsageStats } from '@shared/types';
import { PROVIDER_DEEPL } from '@shared/constants';

export class DeepLProvider implements TranslationProvider {
  readonly id = PROVIDER_DEEPL;
  readonly name = 'DeepL';
  readonly maxTextLength = 5000;
  readonly requiresApiKey = true;
  readonly supportedLanguages = [
    { source: 'zh', target: 'en' },
    { source: 'en', target: 'zh' },
    { source: 'ja', target: 'en' },
    { source: 'en', target: 'ja' },
    { source: 'auto', target: 'zh' },
    { source: 'auto', target: 'en' },
  ];

  private apiKey: string | null = null;
  private baseUrl = 'https://api-free.deepl.com/v2';

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async translate(params: TranslateParams): Promise<TranslateResult> {
    if (!this.apiKey) throw new Error('DeepL API key not set');

    const start = Date.now();
    const res = await fetch(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `DeepL-Auth-Key ${this.apiKey}`,
      },
      body: JSON.stringify({
        text: [params.text],
        source_lang: params.sourceLang === 'auto' ? undefined : params.sourceLang.toUpperCase(),
        target_lang: params.targetLang.toUpperCase(),
      }),
    });

    if (res.status === 429) {
      throw new Error('DeepL rate limited');
    }
    if (res.status === 456) {
      throw new Error('DeepL quota exceeded');
    }
    if (!res.ok) {
      throw new Error(`DeepL error: ${res.status}`);
    }

    const data = await res.json();
    const translation = data.translations[0];

    return {
      text: translation.text,
      detectedSourceLang: translation.detected_source_language?.toLowerCase(),
      provider: this.id,
      confidence: 0.95,
      latencyMs: Date.now() - start,
    };
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    // DeepL 通过 translate 接口自动检测
    const result = await this.translate({
      text,
      sourceLang: 'auto',
      targetLang: 'en',
    });
    return {
      language: result.detectedSourceLang || 'en',
      confidence: 0.9,
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${this.baseUrl}/usage`, {
        headers: { Authorization: `DeepL-Auth-Key ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getUsageStats(): Promise<UsageStats> {
    if (!this.apiKey) throw new Error('API key not set');
    const res = await fetch(`${this.baseUrl}/usage`, {
      headers: { Authorization: `DeepL-Auth-Key ${this.apiKey}` },
    });
    const data = await res.json();
    return {
      totalCalls: 0,
      totalChars: data.character_count,
      remainingQuota: data.character_limit - data.character_count,
    };
  }
}
