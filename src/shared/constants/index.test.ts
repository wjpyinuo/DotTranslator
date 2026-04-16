import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  bucketCharCount,
  DEBOUNCE_TRANSLATE_MS,
  WINDOW_MAIN,
  DB_FILE,
  PRIVACY_ALLOWED_KEYS,
  PRIVACY_BLOCKED_KEYS,
  CLIPBOARD_SENSITIVE_PATTERNS,
  APP_VERSION,
} from './index';

describe('Constants', () => {
  it('SUPPORTED_LANGUAGES should include auto and major languages', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('auto');
    expect(codes).toContain('zh');
    expect(codes).toContain('en');
    expect(codes).toContain('ja');
    expect(codes).toContain('ko');
    expect(codes.length).toBeGreaterThanOrEqual(10);
  });

  it('bucketCharCount should return correct buckets', () => {
    expect(bucketCharCount(0)).toBe(1);
    expect(bucketCharCount(25)).toBe(1);
    expect(bucketCharCount(49)).toBe(1);
    expect(bucketCharCount(50)).toBe(2);
    expect(bucketCharCount(199)).toBe(2);
    expect(bucketCharCount(200)).toBe(3);
    expect(bucketCharCount(999)).toBe(3);
    expect(bucketCharCount(1000)).toBe(4);
    expect(bucketCharCount(4999)).toBe(4);
    expect(bucketCharCount(5000)).toBe(5);
  });

  it('DEBOUNCE_TRANSLATE_MS should be reasonable', () => {
    expect(DEBOUNCE_TRANSLATE_MS).toBeGreaterThan(0);
    expect(DEBOUNCE_TRANSLATE_MS).toBeLessThan(2000);
  });

  it('WINDOW_MAIN should have valid dimensions', () => {
    expect(WINDOW_MAIN.width).toBeGreaterThan(300);
    expect(WINDOW_MAIN.height).toBeGreaterThan(300);
  });

  it('DB_FILE should be a valid filename', () => {
    expect(DB_FILE).toMatch(/\.db$/);
  });

  it('PRIVACY_ALLOWED_KEYS should not contain sensitive keys', () => {
    for (const key of PRIVACY_BLOCKED_KEYS) {
      expect(PRIVACY_ALLOWED_KEYS.has(key)).toBe(false);
    }
  });

  it('CLIPBOARD_SENSITIVE_PATTERNS should detect Chinese phone numbers', () => {
    const phonePattern = CLIPBOARD_SENSITIVE_PATTERNS[1];
    expect(phonePattern.test('13912345678')).toBe(true);
    expect(phonePattern.test('23912345678')).toBe(false);
    expect(phonePattern.test('1291234567')).toBe(false); // only 10 digits
  });

  it('CLIPBOARD_SENSITIVE_PATTERNS should detect Chinese ID numbers', () => {
    const idPattern = CLIPBOARD_SENSITIVE_PATTERNS[2];
    expect(idPattern.test('110101199003071234')).toBe(true);
    expect(idPattern.test('11010119900307123X')).toBe(true);
  });

  it('APP_VERSION should be a valid semver string', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(APP_VERSION.length).toBeGreaterThan(0);
  });

  it('PRIVACY_BLOCKED_KEYS should block all text/secret variants', () => {
    const blocked = Array.from(PRIVACY_BLOCKED_KEYS);
    expect(blocked).toContain('text');
    expect(blocked).toContain('apiKey');
    expect(blocked).toContain('token');
    expect(blocked).toContain('secret');
    expect(blocked).toContain('password');
  });
});
