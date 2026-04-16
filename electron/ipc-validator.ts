/**
 * IPC 输入验证 - 防止渲染进程传递恶意/畸形数据
 * 轻量实现，无外部依赖
 */

/** 通用验证错误 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function assertString(value: unknown, field: string, opts?: { maxLen?: number; pattern?: RegExp; allowEmpty?: boolean }): string {
  if (typeof value !== 'string') throw new ValidationError(`Expected string, got ${typeof value}`, field);
  if (!opts?.allowEmpty && value.trim().length === 0) throw new ValidationError('Must not be empty', field);
  if (opts?.maxLen && value.length > opts.maxLen) throw new ValidationError(`Exceeds max length ${opts.maxLen}`, field);
  if (opts?.pattern && !opts.pattern.test(value)) throw new ValidationError('Invalid format', field);
  return value;
}

function assertNumber(value: unknown, field: string, opts?: { min?: number; max?: number; integer?: boolean }): number {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new ValidationError(`Expected number, got ${typeof value}`, field);
  if (opts?.integer && !Number.isInteger(value)) throw new ValidationError('Expected integer', field);
  if (opts?.min !== undefined && value < opts.min) throw new ValidationError(`Must be >= ${opts.min}`, field);
  if (opts?.max !== undefined && value > opts.max) throw new ValidationError(`Must be <= ${opts.max}`, field);
  return value;
}

function assertArray<T>(value: unknown, field: string, itemValidator: (item: unknown, index: number) => T, opts?: { maxLen?: number }): T[] {
  if (!Array.isArray(value)) throw new ValidationError(`Expected array, got ${typeof value}`, field);
  if (opts?.maxLen && value.length > opts.maxLen) throw new ValidationError(`Array exceeds max length ${opts.maxLen}`, field);
  return value.map((item, i) => itemValidator(item, i));
}

function assertOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') throw new ValidationError(`Expected boolean, got ${typeof value}`, field);
  return value;
}

// ========== 具体验证器 ==========

/** 语言代码模式: 'en', 'zh', 'ja', 'auto' 等 */
const LANG_CODE_PATTERN = /^[a-z]{2}(-[a-zA-Z]{2,4})?$|^auto$/;

export interface TranslationParams {
  text: string;
  sourceLang: string;
  targetLang: string;
  enabledProviders?: string[];
}

export function validateTranslationParams(raw: unknown): TranslationParams {
  if (typeof raw !== 'object' || raw === null) throw new ValidationError('Expected object', 'params');
  const obj = raw as Record<string, unknown>;
  return {
    text: assertString(obj.text, 'text', { maxLen: 50_000 }),
    sourceLang: assertString(obj.sourceLang, 'sourceLang', { maxLen: 10, pattern: LANG_CODE_PATTERN }),
    targetLang: assertString(obj.targetLang, 'targetLang', { maxLen: 10, pattern: LANG_CODE_PATTERN }),
    enabledProviders: obj.enabledProviders !== undefined
      ? assertArray(obj.enabledProviders, 'enabledProviders', (item, i) =>
          assertString(item, `enabledProviders[${i}]`, { maxLen: 30, pattern: /^[a-z][a-z0-9_-]*$/ }), { maxLen: 10 })
      : undefined,
  };
}

export interface HistoryEntry {
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  isFavorite?: boolean;
}

export function validateHistoryEntry(raw: unknown): HistoryEntry {
  if (typeof raw !== 'object' || raw === null) throw new ValidationError('Expected object', 'entry');
  const obj = raw as Record<string, unknown>;
  return {
    sourceText: assertString(obj.sourceText, 'sourceText', { maxLen: 50_000 }),
    targetText: assertString(obj.targetText, 'targetText', { maxLen: 50_000 }),
    sourceLang: assertString(obj.sourceLang, 'sourceLang', { maxLen: 10, pattern: LANG_CODE_PATTERN }),
    targetLang: assertString(obj.targetLang, 'targetLang', { maxLen: 10, pattern: LANG_CODE_PATTERN }),
    provider: assertString(obj.provider, 'provider', { maxLen: 30, pattern: /^[a-z][a-z0-9_-]*$/ }),
    isFavorite: assertOptionalBoolean(obj.isFavorite, 'isFavorite'),
  };
}

/** UUID v4 格式 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateId(raw: unknown): string {
  return assertString(raw, 'id', { maxLen: 36, pattern: UUID_PATTERN });
}

export function validateIdArray(raw: unknown): string[] {
  return assertArray(raw, 'ids', (item, i) => {
    const s = assertString(item, `ids[${i}]`, { maxLen: 36, pattern: UUID_PATTERN });
    return s;
  }, { maxLen: 500 });
}

export function validateResizeParams(raw: unknown): { width: number; height: number } {
  if (typeof raw !== 'object' || raw === null) throw new ValidationError('Expected object', 'resize');
  const obj = raw as Record<string, unknown>;
  return {
    width: assertNumber(obj.width, 'width', { min: 200, max: 3840, integer: true }),
    height: assertNumber(obj.height, 'height', { min: 200, max: 2160, integer: true }),
  };
}

export function validateTheme(raw: unknown): string {
  const theme = assertString(raw, 'theme', { maxLen: 20 });
  const allowed = new Set(['light', 'dark', 'system']);
  if (!allowed.has(theme)) throw new ValidationError(`Theme must be one of: ${[...allowed].join(', ')}`, 'theme');
  return theme;
}

export function validateStorageKey(raw: unknown): string {
  return assertString(raw, 'key', { maxLen: 100, pattern: /^[a-zA-Z0-9_.-]+$/ });
}

export function validateStorageValue(raw: unknown): unknown {
  // 值可以是任意 JSON 可序列化类型，限制大小
  const json = JSON.stringify(raw);
  if (json.length > 100_000) throw new ValidationError('Storage value too large', 'value');
  return raw;
}

export function validateSearchParams(raw: unknown): string {
  return assertString(raw, 'query', { maxLen: 500 });
}

export function validateLimit(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  return assertNumber(raw, 'limit', { min: 1, max: 5000, integer: true });
}

export function validateOcrBase64(raw: unknown): string {
  const s = assertString(raw, 'imageBase64', { maxLen: 10_000_000 }); // ~7.5MB 图片
  // 基本 base64 格式检查
  if (!/^[A-Za-z0-9+/]+=*$/.test(s)) throw new ValidationError('Invalid base64 format', 'imageBase64');
  return s;
}

export function validateFilename(raw: unknown): string {
  const name = assertString(raw, 'filename', { maxLen: 255 });
  // 防止路径遍历
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new ValidationError('Filename must not contain path separators or ..', 'filename');
  }
  // 仅允许安全字符
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
    throw new ValidationError('Filename contains invalid characters', 'filename');
  }
  return name;
}

export function validateContent(raw: unknown): string {
  return assertString(raw, 'content', { maxLen: 1_000_000, allowEmpty: true });
}

export function validateTmParams(raw: unknown[]): { text: string; sourceLang: string; targetLang: string } {
  const [text, sourceLang, targetLang] = raw;
  return {
    text: assertString(text, 'text', { maxLen: 50_000 }),
    sourceLang: assertString(sourceLang, 'sourceLang', { maxLen: 10, pattern: LANG_CODE_PATTERN }),
    targetLang: assertString(targetLang, 'targetLang', { maxLen: 10, pattern: LANG_CODE_PATTERN }),
  };
}

export function validateTmInsertParams(raw: unknown[]): { text: string; targetText: string; sourceLang: string; targetLang: string } {
  const [text, targetText, sourceLang, targetLang] = raw;
  return {
    text: assertString(text, 'text', { maxLen: 50_000 }),
    targetText: assertString(targetText, 'targetText', { maxLen: 50_000 }),
    sourceLang: assertString(sourceLang, 'sourceLang', { maxLen: 10, pattern: LANG_CODE_PATTERN }),
    targetLang: assertString(targetLang, 'targetLang', { maxLen: 10, pattern: LANG_CODE_PATTERN }),
  };
}

export function validateLanguageDetectText(raw: unknown): string {
  return assertString(raw, 'text', { maxLen: 10_000 });
}
