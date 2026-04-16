import type { TranslationProvider, TranslateParams, TranslateResult, LanguageDetection, UsageStats } from '@shared/types';
import { PROVIDER_BAIDU } from '@shared/constants';
import { createHash } from 'crypto';

export class BaiduProvider implements TranslationProvider {
  readonly id = PROVIDER_BAIDU;
  readonly name = '百度翻译';
  readonly maxTextLength = 5000;
  readonly requiresApiKey = true;
  readonly supportedLanguages = [
    { source: 'auto', target: 'zh' },
    { source: 'zh', target: 'en' },
    { source: 'en', target: 'zh' },
    { source: 'zh', target: 'ja' },
    { source: 'ja', target: 'zh' },
    { source: 'zh', target: 'ko' },
    { source: 'ko', target: 'zh' },
    { source: 'zh', target: 'fr' },
    { source: 'fr', target: 'zh' },
    { source: 'zh', target: 'de' },
    { source: 'de', target: 'zh' },
    { source: 'zh', target: 'es' },
    { source: 'es', target: 'zh' },
    { source: 'zh', target: 'ru' },
    { source: 'ru', target: 'zh' },
  ];

  private appId = '';
  private secretKey = '';

  setCredentials(appId: string, secretKey: string): void {
    this.appId = appId;
    this.secretKey = secretKey;
  }

  private generateSign(query: string, salt: string): string {
    const str = this.appId + query + salt + this.secretKey;
    return createHash('md5').update(str).digest('hex');
  }

  async translate(params: TranslateParams): Promise<TranslateResult> {
    if (!this.appId || !this.secretKey) throw new Error('Baidu credentials not set');

    const start = Date.now();
    const salt = Date.now().toString();
    const sign = this.generateSign(params.text, salt);

    const langMap: Record<string, string> = {
      zh: 'zh', en: 'en', ja: 'jp', ko: 'kor',
      fr: 'fra', de: 'de', es: 'spa', ru: 'ru',
      pt: 'pt', it: 'it', auto: 'auto',
    };
    const from = langMap[params.sourceLang] || params.sourceLang;
    const to = langMap[params.targetLang] || params.targetLang;

    const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(params.text)}&from=${from}&to=${to}&appid=${this.appId}&salt=${salt}&sign=${sign}`;

    const res = await fetch(url, { signal: params.signal });
    if (!res.ok) throw new Error(`Baidu Translate error: ${res.status}`);

    const data = await res.json();
    if (data.error_code) {
      const code = String(data.error_code);
      if (code === '54003') throw new Error('Baidu rate limited');
      if (code === '52003') throw new Error('Baidu credentials not set');
      if (code === '54001') throw new Error('Baidu sign error');
      throw new Error(`Baidu error: ${data.error_code} ${data.error_msg}`);
    }

    if (!Array.isArray(data.trans_result) || data.trans_result.length === 0) {
      throw new Error('Baidu returned empty translation result');
    }

    const text = data.trans_result.map((item: { dst: string }) => item.dst).join('\n');

    return {
      text,
      detectedSourceLang: data.from,
      provider: this.id,
      confidence: 0.85,
      latencyMs: Date.now() - start,
    };
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    const result = await this.translate({ text, sourceLang: 'auto', targetLang: 'en' });
    return {
      language: result.detectedSourceLang || 'en',
      confidence: 0.8,
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.appId && this.secretKey);
  }

  async getUsageStats(): Promise<UsageStats> {
    return { totalCalls: 0, totalChars: 0 };
  }
}
