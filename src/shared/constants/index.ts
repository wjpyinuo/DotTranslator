// 支持的语言列表
export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: '自动检测' },
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' },
  { code: 'pt', name: 'Português' },
  { code: 'it', name: 'Italiano' },
] as const;

// 引擎 ID
export const PROVIDER_DEEPL = 'deepl';
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_BAIDU = 'baidu';

// 字符数分桶
export function bucketCharCount(count: number): number {
  if (count < 50) return 1;
  if (count < 200) return 2;
  if (count < 1000) return 3;
  if (count < 5000) return 4;
  return 5;
}

// 心跳间隔
export const HEARTBEAT_MS = 30 * 60 * 1000; // 30 分钟
export const FLUSH_MS = 5 * 60 * 1000;       // 5 分钟批量刷
export const MAX_QUEUE = 50;
export const MAX_RETRY_QUEUE = 200;

// 防抖延迟
export const DEBOUNCE_TRANSLATE_MS = 300;

// 窗口尺寸
export const WINDOW_MAIN = { width: 420, height: 560 };
export const WINDOW_MINI_CARD = { width: 200, height: 80 };
export const WINDOW_PIP = { width: 320, height: 200 };

// 数据库
export const DB_FILE = 'dottranslator.db';

// 遥测隐私白名单
export const PRIVACY_ALLOWED_KEYS = new Set([
  'provider', 'charCountBucket', 'errorCode', 'format', 'engine', 'feature',
]);

export const PRIVACY_BLOCKED_KEYS = [
  'text', 'sourceText', 'targetText', 'translation',
  'clipboard', 'content', 'filename', 'filepath',
  'apiKey', 'token', 'secret', 'password',
] as const;

// 剪贴板安全过滤
export const CLIPBOARD_BLACKLIST = [
  /\d{16}/,                        // 信用卡号
  /1[3-9]\d{9}/,                   // 手机号
  /(?=.*[a-z])(?=.*\d)[a-z\d]{8,}/i, // 密码模式
] as const;
