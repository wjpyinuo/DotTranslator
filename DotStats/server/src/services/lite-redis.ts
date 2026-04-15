/**
 * 内存 Redis 替代方案 - 轻量模式使用
 * 使用 Map 和 Set 模拟 Redis 的 sorted set、HyperLogLog、hash、list、stream
 */

// 内存数据结构
const sortedSets = new Map<string, Map<string, number>>();
const hyperLogLogs = new Map<string, Set<string>>();
const hashes = new Map<string, Map<string, string>>();
const lists = new Map<string, string[]>();

export async function initRedis(): Promise<void> {
  // 内存模式，无需初始化连接
  console.log('[Lite] Redis replaced with in-memory storage');
}

// 模拟 Redis client 接口（仅供 shutdown 时调用）
export function getRedis() {
  return { quit: async () => {} };
}

// ==================== 实时在线 (Sorted Set) ====================

export async function setOnline(instanceId: string): Promise<void> {
  if (!sortedSets.has('online:instances')) sortedSets.set('online:instances', new Map());
  sortedSets.get('online:instances')!.set(instanceId, Date.now());
}

export async function getOnlineCount(windowMs = 5 * 60 * 1000): Promise<number> {
  const set = sortedSets.get('online:instances');
  if (!set) return 0;
  const cutoff = Date.now() - windowMs;
  let count = 0;
  for (const score of set.values()) {
    if (score >= cutoff) count++;
  }
  return count;
}

export async function cleanExpiredOnline(): Promise<void> {
  const set = sortedSets.get('online:instances');
  if (!set) return;
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, score] of set.entries()) {
    if (score < cutoff) set.delete(key);
  }
}

// ==================== DAU / WAU (HyperLogLog 近似) ====================

export async function addToDAU(instanceId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `dau:${today}`;
  if (!hyperLogLogs.has(key)) hyperLogLogs.set(key, new Set());
  hyperLogLogs.get(key)!.add(instanceId);
}

export async function getDAU(date?: string): Promise<number> {
  const d = date || new Date().toISOString().split('T')[0];
  return hyperLogLogs.get(`dau:${d}`)?.size || 0;
}

export async function addToWAU(instanceId: string): Promise<void> {
  const week = getWeekKey();
  const key = `wau:${week}`;
  if (!hyperLogLogs.has(key)) hyperLogLogs.set(key, new Set());
  hyperLogLogs.get(key)!.add(instanceId);
}

export async function getWAU(): Promise<number> {
  return hyperLogLogs.get(`wau:${getWeekKey()}`)?.size || 0;
}

// ==================== 功能计数 (Hash) ====================

export async function incrementFeature(feature: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `features:${today}`;
  if (!hashes.has(key)) hashes.set(key, new Map());
  const h = hashes.get(key)!;
  const prev = parseInt(h.get(feature) || '0', 10);
  h.set(feature, String(prev + 1));
}

export async function getFeatureCounts(date?: string): Promise<Record<string, number>> {
  const d = date || new Date().toISOString().split('T')[0];
  const h = hashes.get(`features:${d}`);
  if (!h) return {};
  const result: Record<string, number> = {};
  for (const [k, v] of h.entries()) {
    result[k] = parseInt(v, 10);
  }
  return result;
}

// ==================== 版本/OS 分布 ====================

export async function updateVersion(instanceId: string, version: string): Promise<void> {
  if (!hashes.has('versions:instances')) hashes.set('versions:instances', new Map());
  if (!hashes.has('versions:counts')) hashes.set('versions:counts', new Map());

  const instances = hashes.get('versions:instances')!;
  const counts = hashes.get('versions:counts')!;

  const prevVersion = instances.get(instanceId);
  if (prevVersion === version) return;

  instances.set(instanceId, version);

  if (prevVersion) {
    const prevCount = parseInt(counts.get(prevVersion) || '0', 10);
    counts.set(prevVersion, String(Math.max(0, prevCount - 1)));
  }
  const newCount = parseInt(counts.get(version) || '0', 10);
  counts.set(version, String(newCount + 1));
}

export async function getVersionDistribution(): Promise<Record<string, number>> {
  const h = hashes.get('versions:counts');
  if (!h) return {};
  const result: Record<string, number> = {};
  for (const [k, v] of h.entries()) {
    const count = parseInt(v, 10);
    if (count > 0) result[k] = count;
  }
  return result;
}

export async function getOSDistribution(): Promise<Record<string, number>> {
  const h = hashes.get('os:counts');
  if (!h) return {};
  const result: Record<string, number> = {};
  for (const [k, v] of h.entries()) {
    result[k] = parseInt(v, 10);
  }
  return result;
}

// ==================== 事件流 (List) ====================

export async function pushEventStream(event: Record<string, unknown>): Promise<void> {
  if (!lists.has('events:stream')) lists.set('events:stream', []);
  const list = lists.get('events:stream')!;
  list.unshift(JSON.stringify(event));
  if (list.length > 1000) list.length = 1000;
}

export async function getEventStream(limit = 20): Promise<Record<string, unknown>[]> {
  const list = lists.get('events:stream');
  if (!list) return [];
  return list.slice(0, limit).map((item) => JSON.parse(item));
}

// ==================== 辅助 ====================

function getWeekKey(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}
