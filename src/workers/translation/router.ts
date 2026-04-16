import type { TranslationProvider, TranslateParams, TranslateResult } from '@shared/types';
import { DeepLProvider } from './providers/deepl';
import { YoudaoProvider } from './providers/youdao';
import { BaiduProvider } from './providers/baidu';
import { FallbackProvider } from './providers/fallback';
import { createLogger } from '@shared/logger';

const log = createLogger('Router');

/** 错误分类：帮助 UI 和熔断器做出更智能的决策 */
export type ErrorCategory =
  | 'rate_limited'    // API 限流（429），不应计入失败次数
  | 'auth_failed'     // 凭据错误/未配置
  | 'quota_exceeded'  // 配额用完
  | 'network'         // 网络超时/连接失败
  | 'timeout'         // 翻译超时（>10s）
  | 'unknown';        // 其他错误

/**
 * 根据错误消息分类错误类型
 * 不同类型决定不同的熔断策略：
 * - rate_limited / quota_exceeded：不计入熔断失败计数
 * - auth_failed：不计入熔断（配置问题，不是服务故障）
 * - network / timeout / unknown：正常计入熔断失败计数
 */
export function classifyError(error: unknown): ErrorCategory {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) {
    return 'rate_limited';
  }
  if (lower.includes('quota') || lower.includes('额度') || lower.includes('456')) {
    return 'quota_exceeded';
  }
  if (lower.includes('credentials') || lower.includes('not set') || lower.includes('api key')) {
    return 'auth_failed';
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'timeout';
  }
  if (lower.includes('fetch failed') || lower.includes('econnrefused') || lower.includes('enotfound') ||
      lower.includes('network') || lower.includes('dns') || lower.includes('tls')) {
    return 'network';
  }
  return 'unknown';
}

/** 不计入熔断失败的错误类别 */
const NO_CIRCUIT_TRIP: ErrorCategory[] = ['rate_limited', 'quota_exceeded', 'auth_failed'];

/** 对比翻译单个引擎的错误信息 */
export interface CompareError {
  providerId: string;
  error: string;
  /** 错误分类 */
  category: ErrorCategory;
  /** 是否因熔断而跳过 */
  circuitBroken: boolean;
}

/** translateCompare 的返回结果，同时包含成功结果和失败错误 */
export interface CompareResult {
  /** 翻译成功的结果 */
  results: TranslateResult[];
  /** 翻译失败的错误（UI 可选择性展示） */
  errors: CompareError[];
}
const DEFAULT_TIMEOUT_MS = 10_000;

/** EMA 平滑系数：越小越平滑，0.3 = 新数据权重 30% */
const EMA_ALPHA = 0.3;

/** 熔断器配置 */
const CIRCUIT_BREAKER = {
  /** 连续失败 N 次后熔断 */
  failureThreshold: 5,
  /** 熔断后冷却时间（毫秒），冷却后进入半开状态允许试探 */
  cooldownMs: 30_000,
};

/**
 * 智能路由评分权重配置
 * 三项权重之和应为 1.0
 */
export interface ScoringWeights {
  /** 错误率权重 (0~1)，越高越倾向于选择低错误率引擎 */
  errorRate: number;
  /** 成本权重 (0~1)，免费引擎得分更高 */
  cost: number;
  /** 基础可用性权重 (0~1)，available 的引擎保底得分 */
  availability: number;
}

const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  errorRate: 0.5,
  cost: 0.3,
  availability: 0.2,
};

/** 免费引擎的成本得分 */
const FREE_PROVIDER_COST_SCORE = 1.0;
/** 付费引擎的成本得分 */
const PAID_PROVIDER_COST_SCORE = 0.7;

/**
 * 带超时的 Promise 包装
 * 使用 AbortController 取消底层请求，超时后真正中断网络连接
 */
function withTimeout<T>(promiseFactory: (signal: AbortSignal) => Promise<T>, timeoutMs: number, providerId: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const promise = promiseFactory(controller.signal);

  return promise.then(
    (value) => {
      clearTimeout(timer);
      return value;
    },
    (err) => {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Provider "${providerId}" timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  );
}

export interface RouterConfig {
  /** 翻译超时（毫秒） */
  timeoutMs?: number;
  /** EMA 平滑系数 */
  emaAlpha?: number;
  /** 熔断器配置 */
  circuitBreaker?: {
    failureThreshold?: number;
    cooldownMs?: number;
  };
  /** 智能路由评分权重 */
  scoringWeights?: Partial<ScoringWeights>;
}

interface CircuitState {
  failures: number;
  state: 'closed' | 'open' | 'half-open';
  openedAt: number;
}

export class TranslationRouter {
  private providers = new Map<string, TranslationProvider>();
  /** 每个 provider 的 EMA 错误率（0~1），0 = 无错误 */
  private errorRates = new Map<string, number>();
  /** 熔断器状态 */
  private circuits = new Map<string, CircuitState>();

  // 可配置参数
  private readonly timeoutMs: number;
  private readonly emaAlpha: number;
  private readonly cbFailureThreshold: number;
  private readonly cbCooldownMs: number;
  private readonly weights: ScoringWeights;

  constructor(config?: RouterConfig) {
    this.timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.emaAlpha = config?.emaAlpha ?? EMA_ALPHA;
    this.cbFailureThreshold = config?.circuitBreaker?.failureThreshold ?? CIRCUIT_BREAKER.failureThreshold;
    this.cbCooldownMs = config?.circuitBreaker?.cooldownMs ?? CIRCUIT_BREAKER.cooldownMs;
    this.weights = {
      ...DEFAULT_SCORING_WEIGHTS,
      ...config?.scoringWeights,
    };

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
    timeoutMs: number = this.timeoutMs
  ): Promise<TranslateResult> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider "${providerId}" not found`);

    // 文本长度校验（在调用 API 前拦截，避免无意义请求）
    if (!params.text?.trim()) {
      throw new Error('Translation text is empty');
    }
    if (params.text.length > provider.maxTextLength) {
      throw new Error(`Text too long (${params.text.length} chars, max ${provider.maxTextLength})`);
    }

    // 熔断器检查
    if (this.isCircuitOpen(providerId)) {
      throw new Error(`Provider "${providerId}" is circuit-broken (too many recent failures)`);
    }

    try {
      const result = await withTimeout(
        (signal) => provider.translate({ ...params, signal }),
        timeoutMs,
        providerId
      );
      this.recordSuccess(providerId);
      return result;
    } catch (error) {
      // 根据错误类型决定是否计入熔断失败
      const category = classifyError(error);
      if (!NO_CIRCUIT_TRIP.includes(category)) {
        this.recordError(providerId);
      }
      throw error;
    }
  }

  /**
   * 翻译对比模式：同时调用所有可用引擎（各自带超时）
   * 返回 CompareResult，包含成功结果和失败错误（UI 可选择性展示）
   */
  async translateCompare(
    params: TranslateParams,
    enabledProviders: string[]
  ): Promise<CompareResult> {
    const errors: CompareError[] = [];

    const tasks = enabledProviders
      .filter((id) => this.providers.has(id))
      .map(async (id) => {
        try {
          return await this.translateWithProvider(id, params);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push({
            providerId: id,
            error: msg,
            category: classifyError(error),
            circuitBroken: this.isCircuitOpen(id),
          });
          return null;
        }
      });

    const settled = await Promise.allSettled(tasks);
    const results = settled
      .filter((r): r is PromiseFulfilledResult<TranslateResult | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((v): v is TranslateResult => v !== null);

    return { results, errors };
  }

  /**
   * 智能路由：选择最佳引擎
   */
  async smartRoute(params: TranslateParams, enabledProviders: string[]): Promise<TranslateResult> {
    const scores = new Map<string, number>();
    const { errorRate: wError, cost: wCost, availability: wAvail } = this.weights;

    for (const id of enabledProviders) {
      const provider = this.providers.get(id);
      if (!provider) continue;

      // 跳过熔断中的 provider
      if (this.isCircuitOpen(id)) continue;

      const available = await provider.isAvailable();
      if (!available) continue;

      const errorRate = this.getErrorRate(id);
      const costScore = provider.requiresApiKey ? PAID_PROVIDER_COST_SCORE : FREE_PROVIDER_COST_SCORE;
      const score = wError * (1 - errorRate) + wCost * costScore + wAvail;
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
    this.errorRates.set(providerId, prev * (1 - this.emaAlpha));
    const circuit = this.circuits.get(providerId);
    if (circuit) {
      circuit.failures = 0;
      circuit.state = 'closed';
    }
  }

  private recordError(providerId: string): void {
    const prev = this.errorRates.get(providerId) ?? 0;
    this.errorRates.set(providerId, prev + (1 - prev) * this.emaAlpha);
    let circuit = this.circuits.get(providerId);
    if (!circuit) {
      circuit = { failures: 0, state: 'closed', openedAt: 0 };
      this.circuits.set(providerId, circuit);
    }
    circuit.failures++;
    if (circuit.failures >= this.cbFailureThreshold && circuit.state === 'closed') {
      circuit.state = 'open';
      circuit.openedAt = Date.now();
      log.warn(`[CircuitBreaker] Provider "${providerId}" OPENED (${circuit.failures} consecutive failures)`);
    }
  }

  private getErrorRate(providerId: string): number {
    return this.errorRates.get(providerId) ?? 0;
  }

  /**
   * 检查熔断器是否处于打开状态
   * - closed: 正常放行
   * - open: 超过冷却时间后自动进入 half-open（允许一次试探）
   * - half-open: 放行，由 translateWithProvider 的 success/error 回调决定后续状态
   */
  private isCircuitOpen(providerId: string): boolean {
    const circuit = this.circuits.get(providerId);
    if (!circuit || circuit.state === 'closed') return false;

    if (circuit.state === 'open') {
      const elapsed = Date.now() - circuit.openedAt;
      if (elapsed >= this.cbCooldownMs) {
        circuit.state = 'half-open';
        log.info(`[CircuitBreaker] Provider "${providerId}" HALF-OPEN (cooldown elapsed)`);
        return false;
      }
      return true;
    }

    return false;
  }

  // ========== 熔断器状态持久化 ==========

  /**
   * 导出所有 provider 的熔断器状态（供外部持久化到数据库）
   */
  exportCircuitStates(): Array<{
    providerId: string;
    failures: number;
    state: 'closed' | 'open' | 'half-open';
    openedAt: number;
    errorRate: number;
  }> {
    const result: Array<{
      providerId: string;
      failures: number;
      state: 'closed' | 'open' | 'half-open';
      openedAt: number;
      errorRate: number;
    }> = [];

    for (const [providerId, circuit] of this.circuits) {
      if (circuit.state !== 'closed' || circuit.failures > 0) {
        result.push({
          providerId,
          failures: circuit.failures,
          state: circuit.state,
          openedAt: circuit.openedAt,
          errorRate: this.errorRates.get(providerId) ?? 0,
        });
      }
    }
    return result;
  }

  /**
   * 从外部数据恢复熔断器状态（应用启动时调用）
   */
  importCircuitStates(
    states: Array<{
      providerId: string;
      failures: number;
      state: 'closed' | 'open' | 'half-open';
      openedAt: number;
      errorRate: number;
    }>
  ): void {
    for (const s of states) {
      this.circuits.set(s.providerId, {
        failures: s.failures,
        state: s.state,
        openedAt: s.openedAt,
      });
      this.errorRates.set(s.providerId, s.errorRate);
    }
    if (states.length > 0) {
      log.info(`[CircuitBreaker] Restored state for ${states.length} provider(s)`);
    }
  }
}

export const translationRouter = new TranslationRouter();
