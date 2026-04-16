import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaiduProvider } from '../baidu';

describe('BaiduProvider', () => {
  let provider: BaiduProvider;

  beforeEach(() => {
    provider = new BaiduProvider();
    vi.restoreAllMocks();
  });

  it('should have correct metadata', () => {
    expect(provider.id).toBe('baidu');
    expect(provider.name).toBe('百度翻译');
    expect(provider.requiresApiKey).toBe(true);
    expect(provider.maxTextLength).toBe(5000);
  });

  it('should not be available without credentials', async () => {
    const available = await provider.isAvailable();
    expect(available).toBe(false);
  });

  it('should be available with credentials', async () => {
    provider.setCredentials('test-app-id', 'test-secret');
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });

  it('should throw when credentials not set', async () => {
    await expect(
      provider.translate({ text: 'hello', sourceLang: 'en', targetLang: 'zh' })
    ).rejects.toThrow('credentials not set');
  });

  it('should handle Baidu rate limit error code', async () => {
    provider.setCredentials('test-app-id', 'test-secret');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error_code: '54003' }),
    });

    await expect(
      provider.translate({ text: 'hello', sourceLang: 'en', targetLang: 'zh' })
    ).rejects.toThrow('rate limited');
  });

  it('should handle Baidu sign error', async () => {
    provider.setCredentials('test-app-id', 'test-secret');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error_code: '54001' }),
    });

    await expect(
      provider.translate({ text: 'hello', sourceLang: 'en', targetLang: 'zh' })
    ).rejects.toThrow('sign error');
  });

  it('should handle HTTP error', async () => {
    provider.setCredentials('test-app-id', 'test-secret');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(
      provider.translate({ text: 'hello', sourceLang: 'en', targetLang: 'zh' })
    ).rejects.toThrow('503');
  });

  it('should handle empty result', async () => {
    provider.setCredentials('test-app-id', 'test-secret');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ trans_result: [] }),
    });

    await expect(
      provider.translate({ text: 'hello', sourceLang: 'en', targetLang: 'zh' })
    ).rejects.toThrow('empty translation');
  });

  it('should handle successful translation', async () => {
    provider.setCredentials('test-app-id', 'test-secret');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        from: 'en',
        trans_result: [{ dst: '你好' }],
      }),
    });

    const result = await provider.translate({
      text: 'hello',
      sourceLang: 'en',
      targetLang: 'zh',
    });

    expect(result.text).toBe('你好');
    expect(result.provider).toBe('baidu');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should have supported languages', () => {
    expect(provider.supportedLanguages.length).toBeGreaterThan(0);
  });
});
