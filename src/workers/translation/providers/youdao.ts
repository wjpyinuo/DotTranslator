import type { TranslationProvider, TranslateParams, TranslateResult, LanguageDetection, UsageStats } from '@shared/types';
import { PROVIDER_YOUDAO } from '@shared/constants';
import { createHash, randomBytes } from 'crypto';

export class YoudaoProvider implements TranslationProvider {
  readonly id = PROVIDER_YOUDAO;
  readonly name = '有道翻译';
  readonly maxTextLength = 5000;
  readonly requiresApiKey = true;
  readonly supportedLanguages = [
    { source: 'auto', target: 'zh-CHS' },
    { source: 'auto', target: 'en' },
    { source: 'zh-CHS', target: 'en' },
    { source: 'en', target: 'zh-CHS' },
    { source: 'ja', target: 'zh-CHS' },
    { source: 'zh-CHS', target: 'ja' },
    { source: 'ko', target: 'zh-CHS' },
    { source: 'zh-CHS', target: 'ko' },
    { source: 'fr', target: 'zh-CHS' },
    { source: 'zh-CHS', target: 'fr' },
    { source: 'de', target: 'zh-CHS' },
    { source: 'zh-CHS', target: 'de' },
    { source: 'es', target: 'zh-CHS' },
    { source: 'zh-CHS', target: 'es' },
    { source: 'ru', target: 'zh-CHS' },
    { source: 'zh-CHS', target: 'ru' },
  ];

  private appId = '';
  private appSecret = '';

  setCredentials(appId: string, appSecret: string): void {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  /**
   * 有道智云 API v3 签名
   * 签名规则: sha256(appId + truncated_input + salt + curtime + appSecret)
   */
  private generateSign(query: string, salt: string, curtime: string): string {
    const truncated = query.length > 20
      ? query.slice(0, 10) + query.length + query.slice(-10)
      : query;
    const input = this.appId + truncated + salt + curtime + this.appSecret;
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * 语言码映射：内部 ISO 639-1 → 有道语言码
   */
  private mapLangCode(code: string): string {
    const map: Record<string, string> = {
      zh: 'zh-CHS',
      en: 'en',
      ja: 'ja',
      ko: 'ko',
      fr: 'fr',
      de: 'de',
      es: 'es',
      ru: 'ru',
      pt: 'pt',
      it: 'it',
      auto: 'auto',
    };
    return map[code] || code;
  }

  async translate(params: TranslateParams): Promise<TranslateResult> {
    if (!this.appId || !this.appSecret) throw new Error('有道翻译 credentials not set');

    const start = Date.now();
    const salt = randomBytes(8).toString('hex');
    const curtime = Math.floor(Date.now() / 1000).toString();
    const sign = this.generateSign(params.text, salt, curtime);

    const from = this.mapLangCode(params.sourceLang);
    const to = this.mapLangCode(params.targetLang);

    const url = 'https://openapi.youdao.com/api';
    const body = new URLSearchParams({
      q: params.text,
      from,
      to,
      appKey: this.appId,
      salt,
      curtime,
      sign,
      signType: 'v3',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) throw new Error(`有道翻译 HTTP error: ${res.status}`);

    const data = await res.json();

    // 有道错误码处理
    if (data.errorCode && data.errorCode !== '0') {
      const errorMap: Record<string, string> = {
        '101': '缺少必填参数',
        '102': '不支持的语言类型',
        '103': '翻译文本过长',
        '108': 'appKey 无效，请检查应用 ID',
        '110': '无相关服务的有效实例',
        '111': '开发者账号无效',
        '113': 'query 不能为空',
        '202': '签名检验失败，请检查应用密钥',
        '401': '账户已欠费',
        '411': '访问频率受限',
        '412': '长请求过于频繁',
      };
      const msg = errorMap[data.errorCode] || `有道错误: ${data.errorCode} ${data.errorMsg || ''}`;
      throw new Error(msg);
    }

    const translatedText = Array.isArray(data.translation)
      ? data.translation.join('')
      : data.translation || '';

    return {
      text: translatedText,
      detectedSourceLang: data.l || params.sourceLang,
      alternatives: data.returnPhrase || [],
      provider: this.id,
      confidence: 0.9,
      latencyMs: Date.now() - start,
    };
  }

  async detectLanguage(text: string): Promise<LanguageDetection> {
    // 有道 API 本身支持 auto 检测，通过翻译接口获取
    const result = await this.translate({
      text,
      sourceLang: 'auto',
      targetLang: 'en',
    });
    return {
      language: result.detectedSourceLang || 'en',
      confidence: 0.85,
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.appId && this.appSecret);
  }

  async getUsageStats(): Promise<UsageStats> {
    // 有道智云没有公开的用量查询接口
    return { totalCalls: 0, totalChars: 0 };
  }
}
