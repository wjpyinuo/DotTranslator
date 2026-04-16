import { describe, it, expect } from 'vitest';
import {
  validateTranslationParams,
  validateHistoryEntry,
  validateId,
  validateIdArray,
  validateResizeParams,
  validateTheme,
  validateStorageKey,
  validateStorageValue,
  validateSearchParams,
  validateLimit,
  validateOcrBase64,
  validateFilename,
  validateContent,
  validateTmParams,
  validateTmInsertParams,
  validateLanguageDetectText,
  ValidationError,
} from '../ipc-validator';

describe('IPC Validator', () => {
  // ========== validateTranslationParams ==========
  describe('validateTranslationParams', () => {
    it('should accept valid params', () => {
      const result = validateTranslationParams({
        text: 'hello',
        sourceLang: 'en',
        targetLang: 'zh',
      });
      expect(result.text).toBe('hello');
      expect(result.sourceLang).toBe('en');
      expect(result.targetLang).toBe('zh');
    });

    it('should accept auto as source language', () => {
      const result = validateTranslationParams({
        text: 'hello',
        sourceLang: 'auto',
        targetLang: 'zh',
      });
      expect(result.sourceLang).toBe('auto');
    });

    it('should accept enabledProviders array', () => {
      const result = validateTranslationParams({
        text: 'hello',
        sourceLang: 'en',
        targetLang: 'zh',
        enabledProviders: ['deepl', 'baidu'],
      });
      expect(result.enabledProviders).toEqual(['deepl', 'baidu']);
    });

    it('should reject null params', () => {
      expect(() => validateTranslationParams(null)).toThrow(ValidationError);
    });

    it('should reject empty text', () => {
      expect(() => validateTranslationParams({
        text: '',
        sourceLang: 'en',
        targetLang: 'zh',
      })).toThrow(ValidationError);
    });

    it('should reject text exceeding max length', () => {
      expect(() => validateTranslationParams({
        text: 'x'.repeat(50_001),
        sourceLang: 'en',
        targetLang: 'zh',
      })).toThrow(ValidationError);
    });

    it('should reject invalid language codes', () => {
      expect(() => validateTranslationParams({
        text: 'hello',
        sourceLang: 'INVALID',
        targetLang: 'zh',
      })).toThrow(ValidationError);
    });

    it('should reject too many enabledProviders', () => {
      const providers = Array.from({ length: 11 }, (_, i) => `p${i}`);
      expect(() => validateTranslationParams({
        text: 'hello',
        sourceLang: 'en',
        targetLang: 'zh',
        enabledProviders: providers,
      })).toThrow(ValidationError);
    });

    it('should reject invalid provider name format', () => {
      expect(() => validateTranslationParams({
        text: 'hello',
        sourceLang: 'en',
        targetLang: 'zh',
        enabledProviders: ['invalid provider!'],
      })).toThrow(ValidationError);
    });
  });

  // ========== validateHistoryEntry ==========
  describe('validateHistoryEntry', () => {
    it('should accept valid entry', () => {
      const result = validateHistoryEntry({
        sourceText: 'hello',
        targetText: '你好',
        sourceLang: 'en',
        targetLang: 'zh',
        provider: 'deepl',
      });
      expect(result.sourceText).toBe('hello');
      expect(result.targetText).toBe('你好');
    });

    it('should accept optional isFavorite', () => {
      const result = validateHistoryEntry({
        sourceText: 'hello',
        targetText: '你好',
        sourceLang: 'en',
        targetLang: 'zh',
        provider: 'deepl',
        isFavorite: true,
      });
      expect(result.isFavorite).toBe(true);
    });

    it('should reject missing fields', () => {
      expect(() => validateHistoryEntry({
        sourceText: 'hello',
      })).toThrow(ValidationError);
    });
  });

  // ========== validateId ==========
  describe('validateId', () => {
    it('should accept valid UUID v4', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(validateId(uuid)).toBe(uuid);
    });

    it('should reject non-UUID format', () => {
      expect(() => validateId('not-a-uuid')).toThrow(ValidationError);
    });

    it('should reject empty string', () => {
      expect(() => validateId('')).toThrow(ValidationError);
    });

    it('should reject number', () => {
      expect(() => validateId(123)).toThrow(ValidationError);
    });
  });

  // ========== validateIdArray ==========
  describe('validateIdArray', () => {
    it('should accept valid UUID array', () => {
      const ids = ['550e8400-e29b-41d4-a716-446655440000'];
      expect(validateIdArray(ids)).toEqual(ids);
    });

    it('should reject non-array', () => {
      expect(() => validateIdArray('not-array')).toThrow(ValidationError);
    });

    it('should reject too many items', () => {
      const ids = Array.from({ length: 501 }, () => '550e8400-e29b-41d4-a716-446655440000');
      expect(() => validateIdArray(ids)).toThrow(ValidationError);
    });
  });

  // ========== validateResizeParams ==========
  describe('validateResizeParams', () => {
    it('should accept valid dimensions', () => {
      const result = validateResizeParams({ width: 800, height: 600 });
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should reject out-of-range width', () => {
      expect(() => validateResizeParams({ width: 100, height: 600 })).toThrow(ValidationError);
      expect(() => validateResizeParams({ width: 5000, height: 600 })).toThrow(ValidationError);
    });

    it('should reject non-integer', () => {
      expect(() => validateResizeParams({ width: 800.5, height: 600 })).toThrow(ValidationError);
    });
  });

  // ========== validateTheme ==========
  describe('validateTheme', () => {
    it('should accept valid themes', () => {
      expect(validateTheme('light')).toBe('light');
      expect(validateTheme('dark')).toBe('dark');
      expect(validateTheme('system')).toBe('system');
    });

    it('should reject invalid theme', () => {
      expect(() => validateTheme('midnight')).toThrow(ValidationError);
    });
  });

  // ========== validateStorageKey ==========
  describe('validateStorageKey', () => {
    it('should accept valid keys', () => {
      expect(validateStorageKey('theme')).toBe('theme');
      expect(validateStorageKey('server.url')).toBe('server.url');
      expect(validateStorageKey('my_key-1')).toBe('my_key-1');
    });

    it('should reject keys with special characters', () => {
      expect(() => validateStorageKey('key with spaces')).toThrow(ValidationError);
      expect(() => validateStorageKey('key/with/slashes')).toThrow(ValidationError);
    });
  });

  // ========== validateStorageValue ==========
  describe('validateStorageValue', () => {
    it('should accept serializable values', () => {
      expect(validateStorageValue('hello')).toBe('hello');
      expect(validateStorageValue(42)).toBe(42);
      expect(validateStorageValue({ key: 'value' })).toEqual({ key: 'value' });
    });

    it('should reject overly large values', () => {
      expect(() => validateStorageValue('x'.repeat(100_001))).toThrow(ValidationError);
    });
  });

  // ========== validateSearchParams ==========
  describe('validateSearchParams', () => {
    it('should accept valid search query', () => {
      expect(validateSearchParams('hello world')).toBe('hello world');
    });

    it('should reject empty query', () => {
      expect(() => validateSearchParams('')).toThrow(ValidationError);
    });

    it('should reject overly long query', () => {
      expect(() => validateSearchParams('x'.repeat(501))).toThrow(ValidationError);
    });
  });

  // ========== validateLimit ==========
  describe('validateLimit', () => {
    it('should accept valid limit', () => {
      expect(validateLimit(100)).toBe(100);
    });

    it('should return undefined for null/undefined', () => {
      expect(validateLimit(null)).toBeUndefined();
      expect(validateLimit(undefined)).toBeUndefined();
    });

    it('should reject out-of-range values', () => {
      expect(() => validateLimit(0)).toThrow(ValidationError);
      expect(() => validateLimit(5001)).toThrow(ValidationError);
    });

    it('should reject non-integer', () => {
      expect(() => validateLimit(10.5)).toThrow(ValidationError);
    });
  });

  // ========== validateOcrBase64 ==========
  describe('validateOcrBase64', () => {
    it('should accept valid base64', () => {
      const b64 = Buffer.from('test image data').toString('base64');
      expect(validateOcrBase64(b64)).toBe(b64);
    });

    it('should reject invalid base64 characters', () => {
      expect(() => validateOcrBase64('not!!valid@@base64')).toThrow(ValidationError);
    });

    it('should reject overly large input', () => {
      expect(() => validateOcrBase64('A'.repeat(10_000_001))).toThrow(ValidationError);
    });
  });

  // ========== validateFilename ==========
  describe('validateFilename', () => {
    it('should accept valid filename', () => {
      expect(validateFilename('announcement.txt')).toBe('announcement.txt');
    });

    it('should reject path traversal', () => {
      expect(() => validateFilename('../etc/passwd')).toThrow(ValidationError);
      expect(() => validateFilename('path/to/file')).toThrow(ValidationError);
    });

    it('should reject special characters', () => {
      expect(() => validateFilename('file<script>.txt')).toThrow(ValidationError);
    });
  });

  // ========== validateContent ==========
  describe('validateContent', () => {
    it('should accept valid content', () => {
      expect(validateContent('some content')).toBe('some content');
    });

    it('should accept empty content', () => {
      expect(validateContent('')).toBe('');
    });

    it('should reject overly large content', () => {
      expect(() => validateContent('x'.repeat(1_000_001))).toThrow(ValidationError);
    });
  });

  // ========== validateTmParams ==========
  describe('validateTmParams', () => {
    it('should accept valid params', () => {
      const result = validateTmParams(['hello', 'en', 'zh']);
      expect(result.text).toBe('hello');
      expect(result.sourceLang).toBe('en');
      expect(result.targetLang).toBe('zh');
    });

    it('should reject missing params', () => {
      expect(() => validateTmParams([])).toThrow(ValidationError);
    });
  });

  // ========== validateTmInsertParams ==========
  describe('validateTmInsertParams', () => {
    it('should accept valid params', () => {
      const result = validateTmInsertParams(['hello', '你好', 'en', 'zh']);
      expect(result.text).toBe('hello');
      expect(result.targetText).toBe('你好');
    });
  });

  // ========== validateLanguageDetectText ==========
  describe('validateLanguageDetectText', () => {
    it('should accept valid text', () => {
      expect(validateLanguageDetectText('Hello world')).toBe('Hello world');
    });

    it('should reject empty text', () => {
      expect(() => validateLanguageDetectText('')).toThrow(ValidationError);
    });

    it('should reject overly long text', () => {
      expect(() => validateLanguageDetectText('x'.repeat(10_001))).toThrow(ValidationError);
    });
  });
});
