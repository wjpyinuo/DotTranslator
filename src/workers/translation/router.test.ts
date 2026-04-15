import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslationRouter } from './router';
import type { TranslationProvider, TranslateParams, TranslateResult } from '@shared/types';

// Mock provider for testing
function createMockProvider(id: string, name: string, shouldFail = false): TranslationProvider {
  return {
    id,
    name,
    maxTextLength: 5000,
    requiresApiKey: false,
    supportedLanguages: [{ source: 'en', target: 'zh' }],
    translate: vi.fn(async (_params: TranslateParams): Promise<TranslateResult> => {
      if (shouldFail) throw new Error(`${id} failed`);
      return {
        text: `translated by ${id}`,
        provider: id,
        confidence: 0.9,
        latencyMs: 10,
      };
    }),
    detectLanguage: vi.fn(async () => ({ language: 'en', confidence: 0.9 })),
    isAvailable: vi.fn(async () => true),
    getUsageStats: vi.fn(async () => ({ totalCalls: 0, totalChars: 0 })),
  };
}

describe('TranslationRouter', () => {
  let router: TranslationRouter;

  beforeEach(() => {
    router = new TranslationRouter();
  });

  it('should register and retrieve providers', () => {
    const mock = createMockProvider('test', 'Test Provider');
    router.register(mock);
    expect(router.getProvider('test')).toBeDefined();
    expect(router.getProvider('test')?.name).toBe('Test Provider');
  });

  it('should list all providers', () => {
    const all = router.getAllProviders();
    // Should have at least the default 4 (deepl, youdao, baidu, fallback)
    expect(all.length).toBeGreaterThanOrEqual(4);
    const ids = all.map((p) => p.id);
    expect(ids).toContain('deepl');
    expect(ids).toContain('youdao');
    expect(ids).toContain('baidu');
    expect(ids).toContain('fallback');
  });

  it('should return undefined for unknown provider', () => {
    expect(router.getProvider('nonexistent')).toBeUndefined();
  });

  it('translateCompare should filter out failed providers', async () => {
    const goodProvider = createMockProvider('good', 'Good');
    const badProvider = createMockProvider('bad', 'Bad', true);
    router.register(goodProvider);
    router.register(badProvider);

    const results = await router.translateCompare(
      { text: 'hello', sourceLang: 'en', targetLang: 'zh' },
      ['good', 'bad']
    );

    expect(results.length).toBe(1);
    expect(results[0].provider).toBe('good');
  });

  it('translateCompare should handle all providers failing gracefully', async () => {
    const bad1 = createMockProvider('bad1', 'Bad 1', true);
    const bad2 = createMockProvider('bad2', 'Bad 2', true);
    router.register(bad1);
    router.register(bad2);

    const results = await router.translateCompare(
      { text: 'hello', sourceLang: 'en', targetLang: 'zh' },
      ['bad1', 'bad2']
    );

    expect(results.length).toBe(0);
  });

  it('translateWithProvider should throw for unknown provider', async () => {
    await expect(
      router.translateWithProvider('nonexistent', {
        text: 'hello',
        sourceLang: 'en',
        targetLang: 'zh',
      })
    ).rejects.toThrow('Provider "nonexistent" not found');
  });

  it('smartRoute should select best available provider', async () => {
    const p1 = createMockProvider('p1', 'P1');
    const p2 = createMockProvider('p2', 'P2');
    router.register(p1);
    router.register(p2);

    const result = await router.smartRoute(
      { text: 'hello', sourceLang: 'en', targetLang: 'zh' },
      ['p1', 'p2']
    );

    expect(result).toBeDefined();
    expect(result.text).toContain('translated by');
  });

  it('smartRoute should throw when no providers available', async () => {
    const unavailable = createMockProvider('unavail', 'Unavailable');
    unavailable.isAvailable = vi.fn(async () => false);
    router.register(unavailable);

    await expect(
      router.smartRoute(
        { text: 'hello', sourceLang: 'en', targetLang: 'zh' },
        ['unavail']
      )
    ).rejects.toThrow('No available translation providers');
  });
});
