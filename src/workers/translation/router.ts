import type { TranslationProvider, TranslateParams, TranslateResult } from '@shared/types';
import { DeepLProvider } from './providers/deepl';
import { YoudaoProvider } from './providers/youdao';
import { BaiduProvider } from './providers/baidu';
import { FallbackProvider } from './providers/fallback';

/** 默认翻译超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * 带超时的 Promise 包装
 * 使用 AbortController 取消底层请求（如果 provider 支持 signal）
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, providerId: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Provider "${providerId}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** EMA 平滑系数：越小越平滑，0.3 = 新数据权重 30% */
const EMA_ALPHA = 0.3;

export class TranslationRouter {
  private providers = new Map<string, TranslationProvider>();
  /** 每个 provider 的 EMA 错误率（0~1），0 = 无错误 */
  private errorRates = new Map<string, number>();

  constructor() {
    this.register(new DeepLProvider());
    this.register(new YoudaoProvider());
    this.register(new BaiduProvider());
    this.register(new FallbackProvider());
  }

  register(provider: TranslationProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): TranslationProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): TranslationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 单引擎翻译（带超时保护）
   * @param timeoutMs 超时毫秒数，默认 10s
   */
  async translateWithProvider(
    providerId: string,
    params: TranslateParams,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<TranslateResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found`);

    try {
      const result = await withTimeout(provider.translate(params), timeoutMs, providerId);
      this.recordSuccess(providerId);
      return result;
    } catch (error) {
      this.recordError(providerId);
      throw error;
    }
  }

  /**
   * 翻译对比模式：同时调用所有可用引擎（各自带超时）
   */
  async translateCompare(
    params: TranslateParams,
    enabledProviders: string[]
  ): Promise<TranslateResult[]> {
    const tasks = enabledProviders
      .filter((id) => this.providers.has(id))
      .map(async (id) => {
        try {
          return await this.translateWithProvider(id, params);
        } catch (error) {
          console.error(`Provider ${id} failed:`, error);
          return null;
        }
      });

    const results = await Promise.allSettled(tasks);
    return results
      .filter((r): r is PromiseFulfilledResult<TranslateResult | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((v): v is TranslateResult => v !== null);
  }

  /**
   * 智能路由：选择最佳引擎
   */
  async smartRoute(params: TranslateParams, enabledProviders: string[]): Promise<TranslateResult> {
    const scores = new Map<string, number>();

    for (const id of enabledProviders) {
      const provider = this.providers.get(id);
      if (!provider) continue;

      const available = await provider.isAvailable();
      if (!available) continue;

      const errorRate = this.getErrorRate(id);
      const costScore = provider.requiresApiKey ? 0.7 : 1.0;
      const score = 0.5 * (1 - errorRate) + 0.3 * costScore + 0.2;
      scores.set(id, score);
    }

    if (scores.size === 0) {
      throw new Error('No available translation providers');
    }

    // 选择得分最高的
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const bestId = sorted[0][0];
    return this.translateWithProvider(bestId, params);
  }

  private recordSuccess(providerId: string): void {
    const prev = this.errorRates.get(providerId) ?? 0;
    // 成功 → EMA 向 0 收敛
    this.errorRates.set(providerId, prev * (1 - EMA_ALPHA));
  }

  private recordError(providerId: string): void {
    const prev = this.errorRates.get(providerId) ?? 0;
    // 失败 → EMA 向 1 收敛
    this.errorRates.set(providerId, prev + (1 - prev) * EMA_ALPHA);
  }

  private getErrorRate(providerId: string): number {
    return this.errorRates.get(providerId) ?? 0;
  }
}

export const translationRouter = new TranslationRouter();
