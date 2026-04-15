import type { TranslationProvider, TranslateParams, TranslateResult } from '@shared/types';
import { DeepLProvider } from './providers/deepl';
import { YoudaoProvider } from './providers/youdao';
import { BaiduProvider } from './providers/baidu';

export class TranslationRouter {
  private providers = new Map<string, TranslationProvider>();
  private errorCounts = new Map<string, { total: number; errors: number; windowStart: number }>();

  constructor() {
    this.register(new DeepLProvider());
    this.register(new YoudaoProvider());
    this.register(new BaiduProvider());
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

  async translateWithProvider(providerId: string, params: TranslateParams): Promise<TranslateResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found`);

    try {
      const result = await provider.translate(params);
      this.recordSuccess(providerId);
      return result;
    } catch (error) {
      this.recordError(providerId);
      throw error;
    }
  }

  /**
   * 翻译对比模式：同时调用所有可用引擎
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
    const record = this.errorCounts.get(providerId);
    if (record) {
      record.total++;
    }
  }

  private recordError(providerId: string): void {
    const record = this.errorCounts.get(providerId);
    if (record) {
      record.total++;
      record.errors++;
    } else {
      this.errorCounts.set(providerId, { total: 1, errors: 1, windowStart: Date.now() });
    }
  }

  private getErrorRate(providerId: string): number {
    const record = this.errorCounts.get(providerId);
    if (!record || record.total === 0) return 0;

    // 5 分钟窗口外重置
    if (Date.now() - record.windowStart > 5 * 60 * 1000) {
      this.errorCounts.delete(providerId);
      return 0;
    }

    return record.errors / record.total;
  }
}

export const translationRouter = new TranslationRouter();
