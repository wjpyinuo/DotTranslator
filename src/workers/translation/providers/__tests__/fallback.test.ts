import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FallbackProvider } from '../fallback';

describe('FallbackProvider', () => {
  let provider: FallbackProvider;

  beforeEach(() => {
    provider = new FallbackProvider();
    vi.restoreAllMocks();
  });

  it('should have correct metadata', () => {
    expect(provider.id).toBe('fallback');
    expect(provider.name).toBe('免费翻译');
    expect(provider.requiresApiKey).toBe(false);
    expect(provider.maxTextLength).toBe(5000);
  });

  it('should always be available', async () => {
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });

  it('should have supported languages', () => {
    expect(provider.supportedLanguages.length).toBeGreaterThan(0);
    // Should contain zh↔en
    const hasZhEn = provider.supportedLanguages.some(
      (l) => l.source === 'zh' && l.target === 'en'
    );
    expect(hasZhEn).toBe(true);
  });

  it('should translate via MyMemory API', async () => {
    const mockResponse = {
      responseData: { translatedText: 'Hola', detectedLanguage: 'en' },
      responseStatus: 200,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await provider.translate({
      text: 'Hello',
      sourceLang: 'en',
      targetLang: 'es',
    });

    expect(result.text).toBe('Hola');
    expect(result.provider).toBe('fallback');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    // Verify fetch was called with correct URL
    const fetchUrl = (global.fetch as any).mock.calls[0][0] as string;
    expect(fetchUrl).toContain('api.mymemory.translated.net');
    expect(fetchUrl).toContain('Hello');
    expect(fetchUrl).toContain('en-GB');
    expect(fetchUrl).toContain('es-ES');
  });

  it('should handle rate limit error from MyMemory', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ responseStatus: 429 }),
    });

    await expect(
      provider.translate({ text: 'Hello', sourceLang: 'en', targetLang: 'zh' })
    ).rejects.toThrow('额度已用完');
  });

  it('should handle API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(
      provider.translate({ text: 'Hello', sourceLang: 'en', targetLang: 'zh' })
    ).rejects.toThrow('500');
  });

  it('should handle non-200 response status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        responseStatus: 400,
        responseDetails: 'Invalid language pair',
      }),
    });

    await expect(
      provider.translate({ text: 'Hello', sourceLang: 'en', targetLang: 'zh' })
    ).rejects.toThrow('Invalid language pair');
  });

  it('should map language codes correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        responseData: { translatedText: 'test', detectedLanguage: 'zh-CN' },
        responseStatus: 200,
      }),
    });

    await provider.translate({ text: 'test', sourceLang: 'zh', targetLang: 'en' });

    const fetchUrl = (global.fetch as any).mock.calls[0][0] as string;
    expect(fetchUrl).toContain('zh-CN');
    expect(fetchUrl).toContain('en-GB');
  });

  it('should detect language', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        responseData: { translatedText: 'test', detectedLanguage: 'ja-JP' },
        responseStatus: 200,
      }),
    });

    const detection = await provider.detectLanguage('こんにちは');
    expect(detection.language).toBe('ja-JP');
    expect(detection.confidence).toBeGreaterThan(0);
  });

  it('should return fallback on detection failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const detection = await provider.detectLanguage('test');
    expect(detection.language).toBe('en');
    expect(detection.confidence).toBe(0.5);
  });
});
