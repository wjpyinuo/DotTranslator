/**
 * 轻量级 i18n 模块
 *
 * 用法：
 *   import { t, setLocale, getLocale } from '@/shared/i18n';
 *   t('input.placeholder')                    // "输入要翻译的文本..."
 *   t('input.detectedLang', { lang: '英语' }) // "检测到: 英语"
 */

import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

type LocaleKey = 'zh-CN' | 'en';

const LOCALES: Record<LocaleKey, Record<string, string>> = {
  'zh-CN': zhCN,
  en,
};

let currentLocale: LocaleKey = 'zh-CN';

/**
 * 设置界面语言
 */
export function setLocale(locale: LocaleKey): void {
  if (LOCALES[locale]) {
    currentLocale = locale;
  }
}

/**
 * 获取当前语言
 */
export function getLocale(): LocaleKey {
  return currentLocale;
}

/**
 * 获取可用语言列表
 */
export function getAvailableLocales(): LocaleKey[] {
  return Object.keys(LOCALES) as LocaleKey[];
}

/**
 * 翻译函数
 * @param key 翻译键（如 "input.placeholder"）
 * @param params 插值参数（如 { lang: "英语" }）
 * @returns 翻译后的文本
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = LOCALES[currentLocale] || LOCALES['zh-CN'];
  let text = dict[key] || LOCALES['zh-CN'][key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{{${k}}}`, String(v));
    }
  }

  return text;
}

/**
 * 从系统语言自动检测最佳 locale
 */
export function detectSystemLocale(): LocaleKey {
  if (typeof navigator === 'undefined') return 'zh-CN';

  const lang = navigator.language || 'zh-CN';
  if (lang.startsWith('en')) return 'en';
  return 'zh-CN';
}
