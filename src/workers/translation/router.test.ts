import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslationRouter, classifyError } from './router';
import type { TranslationProvider, TranslateParams, TranslateResult } from '@shared/types';

// Mock provider for testing
function createMockProvider(id: string, name: string, shouldFail = false): TranslationProvider {
  return {
    id,
    name,
    maxTextLength: 5000,
    requiresApiKey: false,
    supportedLanguages: [{ source: 'en', target: 'zh' }],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    const { results, errors } = await router.translateCompare(
      { text: 'hello', sourceLang: 'en', targetLang: 'zh' },
      ['good', 'bad']
    );

    expect(results.length).toBe(1);
    expect(results[0].provider).toBe('good');
    expect(errors.length).toBe(1);
    expect(errors[0].providerId).toBe('bad');
  });

  it('translateCompare should handle all providers failing gracefully', async () => {
    const bad1 = createMockProvider('bad1', 'Bad 1', true);
    const bad2 = createMockProvider('bad2', 'Bad 2', true);
    router.register(bad1);
    router.register(bad2);

    const { results, errors } = await router.translateCompare(
      { text: 'hello', sourceLang: 'en', targetLang: 'zh' },
      ['bad1', 'bad2']
    );

    expect(results.length).toBe(0);
    expect(errors.length).toBe(2);
    expect(errors.map(e => e.providerId)).toEqual(expect.arrayContaining(['bad1', 'bad2']));
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

  // ========== 熔断器测试 ==========
  describe('Circuit Breaker', () => {
    it('should trip circuit after 5 consecutive failures', async () => {
      const failProvider = createMockProvider('fail', 'Fail', true);
      router.register(failProvider);

      // 连续失败 5 次
      for (let i = 0; i < 5; i++) {
        await expect(
          router.translateWithProvider('fail', { text: 'hi', sourceLang: 'en', targetLang: 'zh' })
        ).rejects.toThrow();
      }

      // 第 6 次应该被熔断
      await expect(
        router.translateWithProvider('fail', { text: 'hi', sourceLang: 'en', targetLang: 'zh' })
      ).rejects.toThrow('circuit-broken');
    });

    it('should reset circuit on success', async () => {
      let callCount = 0;
      const flakyProvider: TranslationProvider = {
        ...createMockProvider('flaky', 'Flaky'),
        translate: vi.fn(async () => {
          callCount++;
          if (callCount <= 4) throw new Error('flaky error');
          return { text: 'ok', provider: 'flaky', confidence: 0.9, latencyMs: 10 };
        }),
      };
      router.register(flakyProvider);

      // 4 次失败（未触发熔断）
      for (let i = 0; i < 4; i++) {
        await expect(
          router.translateWithProvider('flaky', { text: 'hi', sourceLang: 'en', targetLang: 'zh' })
        ).rejects.toThrow();
      }

      // 第 5 次成功 → 应重置
      const result = await router.translateWithProvider('flaky', { text: 'hi', sourceLang: 'en', targetLang: 'zh' });
      expect(result.text).toBe('ok');

      // 连续失败计数已重置，再失败 4 次不触发熔断
      for (let i = 0; i < 4; i++) {
        const mock = vi.fn(async () => { throw new Error('fail again'); });
        (flakyProvider as any).translate = mock;
        await expect(
          router.translateWithProvider('flaky', { text: 'hi', sourceLang: 'en', targetLang: 'zh' })
        ).rejects.toThrow();
      }
      // 第 5 次失败才触发熔断
      (flakyProvider as any).translate = vi.fn(async () => { throw new Error('fail again'); });
      await expect(
        router.translateWithProvider('flaky', { text: 'hi', sourceLang: 'en', targetLang: 'zh' })
      ).rejects.toThrow('circuit-broken');
    });

    it('smartRoute should skip circuit-broken providers', async () => {
      const bad = createMockProvider('bad', 'Bad', true);
      const good = createMockProvider('good2', 'Good2');
      router.register(bad);
      router.register(good);

      // trip circuit on bad
      for (let i = 0; i < 5; i++) {
        await router.translateWithProvider('bad', { text: 'hi', sourceLang: 'en', targetLang: 'zh' }).catch(() => {});
      }

      // smartRoute 应跳过 bad，选择 good2
      const result = await router.smartRoute(
        { text: 'hello', sourceLang: 'en', targetLang: 'zh' },
        ['bad', 'good2']
      );
      expect(result.provider).toBe('good2');
    });

    it('rate-limited errors should NOT trip circuit breaker', async () => {
      const rateLimitedProvider = createMockProvider('rl', 'RateLimited', true);
      // Override to throw rate-limited error
      (rateLimitedProvider as any).translate = vi.fn(async () => {
        throw new Error('DeepL rate limited');
      });
      router.register(rateLimitedProvider);

      // 连续 10 次 rate limited → 不应触发熔断
      for (let i = 0; i < 10; i++) {
        await expect(
          router.translateWithProvider('rl', { text: 'hi', sourceLang: 'en', targetLang: 'zh' })
        ).rejects.toThrow('rate limited');
      }

      // 不应被熔断 — 应能继续尝试（错误消息不含 circuit-broken）
      await expect(
        router.translateWithProvider('rl', { text: 'hi', sourceLang: 'en', targetLang: 'zh' })
      ).rejects.toThrow('rate limited');
    });
  });

  // ========== 错误分类测试 ==========
  describe('Error Classification', () => {
    it('should classify rate limit errors', () => {
      expect(classifyError(new Error('DeepL rate limited'))).toBe('rate_limited');
      expect(classifyError(new Error('Baidu rate limited'))).toBe('rate_limited');
      expect(classifyError(new Error('HTTP 429 Too Many Requests'))).toBe('rate_limited');
    });

    it('should classify quota exceeded errors', () => {
      expect(classifyError(new Error('DeepL quota exceeded'))).toBe('quota_exceeded');
      expect(classifyError(new Error('免费翻译今日额度已用完'))).toBe('quota_exceeded');
      expect(classifyError(new Error('HTTP 456'))).toBe('quota_exceeded');
    });

    it('should classify auth errors', () => {
      expect(classifyError(new Error('DeepL API key not set'))).toBe('auth_failed');
      expect(classifyError(new Error('有道翻译 credentials not set'))).toBe('auth_failed');
      expect(classifyError(new Error('Baidu credentials not set'))).toBe('auth_failed');
    });

    it('should classify timeout errors', () => {
      expect(classifyError(new Error('Provider "deepl" timed out after 10000ms'))).toBe('timeout');
    });

    it('should classify network errors', () => {
      expect(classifyError(new Error('fetch failed'))).toBe('network');
      expect(classifyError(new Error('ECONNREFUSED'))).toBe('network');
    });

    it('should classify unknown errors', () => {
      expect(classifyError(new Error('some random error'))).toBe('unknown');
      expect(classifyError(new Error('DeepL error: 500'))).toBe('unknown');
    });
  });
});
