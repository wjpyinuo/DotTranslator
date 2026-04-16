/**
 * DotStats API 响应类型定义
 * 替代分散的 any 类型
 */

// ==================== 通用 ====================

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  checks: Record<string, string>;
  timestamp?: string;
}

// ==================== 实时数据 ====================

export interface RealtimeData {
  onlineNow: number;
  todayActive: number;
  weekActive: number;
  topFeatures: Record<string, number>;
  versionDistribution: Record<string, number>;
  osDistribution: Record<string, number>;
  recentEvents: RecentEvent[];
}

export interface RecentEvent {
  instanceId: string;
  type: string;
  feature?: string;
  timestamp: number;
}

// ==================== 趋势 ====================

export interface TrendPoint {
  period: string;
  dau?: number;
  new_instances?: number;
  heartbeats?: number;
  feature_calls?: number;
}

// ==================== 功能分析 ====================

export interface FeatureStat {
  feature: string;
  total_calls: number;
  unique_users: number;
}

// ==================== 版本分布 ====================

export interface VersionEntry {
  version: string;
  count: number;
  percent?: number;
}

// ==================== 地区分布 ====================

export interface GeoEntry {
  locale: string;
  count: number;
}

// ==================== 引擎分布 ====================

export interface ProviderEntry {
  provider: string;
  count: number;
}

export interface ProviderMetric {
  provider: string;
  date: string;
  total_calls: number;
  success: number;
  fail: number;
  avg_latency: number;
}

// ==================== 留存 ====================

export interface RetentionEntry {
  cohort_week: string;
  cohort_size: number;
  w1_retained: number;
  w2_retained: number;
  w4_retained: number;
  w8_retained: number;
  w12_retained: number;
}

// ==================== 隐私统计 ====================

export interface PrivacyStat {
  privacy_on: number;
}
