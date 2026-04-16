import { createClient, type RedisClientType } from 'redis';

let redis: RedisClientType | null = null;

// 轻量模式：缓存动态导入的 lite 模块
let liteModulePromise: Promise<typeof import('./lite-redis')> | null = null;

async function getLiteModule() {
  if (!liteModulePromise) {
    liteModulePromise = import('./lite-redis');
  }
  return liteModulePromise;
}

export async function initRedis(): Promise<RedisClientType | void> {
  if (process.env.LITE_MODE === '1') {
    const lite = await getLiteModule();
    await lite.initRedis();
    return;
  }

  if (redis) return redis;

  redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redis.on('error', (err) => console.error('Redis error:', err));
  await redis.connect();
  return redis;
}

export async function getRedis() {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).getRedis();
  if (!redis) throw new Error('Redis not initialized');
  return redis;
}

export async function setOnline(instanceId: string): Promise<void> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).setOnline(instanceId);
  const r = getRedis();
  await r.zAdd('online:instances', { score: Date.now(), value: instanceId });
}

export async function getOnlineCount(windowMs = 5 * 60 * 1000): Promise<number> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).getOnlineCount(windowMs);
  const r = getRedis();
  return r.zCount('online:instances', Date.now() - windowMs, '+inf');
}

export async function cleanExpiredOnline(): Promise<void> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).cleanExpiredOnline();
  const r = getRedis();
  await r.zRemRangeByScore('online:instances', 0, Date.now() - 10 * 60 * 1000);
}

export async function addToDAU(instanceId: string): Promise<void> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).addToDAU(instanceId);
  const r = getRedis();
  const today = new Date().toISOString().split('T')[0];
  await r.pfAdd(`dau:${today}`, instanceId);
}

export async function getDAU(date?: string): Promise<number> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).getDAU(date);
  const r = getRedis();
  const d = date || new Date().toISOString().split('T')[0];
  return r.pfCount(`dau:${d}`);
}

export async function addToWAU(instanceId: string): Promise<void> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).addToWAU(instanceId);
  const r = getRedis();
  const week = getWeekKey();
  await r.pfAdd(`wau:${week}`, instanceId);
}

export async function getWAU(): Promise<number> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).getWAU();
  const r = getRedis();
  return r.pfCount(`wau:${getWeekKey()}`);
}

export async function incrementFeature(feature: string): Promise<void> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).incrementFeature(feature);
  const r = getRedis();
  const today = new Date().toISOString().split('T')[0];
  await r.hIncrBy(`features:${today}`, feature, 1);
}

export async function getFeatureCounts(date?: string): Promise<Record<string, number>> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).getFeatureCounts(date);
  const r = getRedis();
  const d = date || new Date().toISOString().split('T')[0];
  const data = await r.hGetAll(`features:${d}`) as Record<string, string>;
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(data)) {
    result[k] = parseInt(v, 10);
  }
  return result;
}

export async function updateVersion(instanceId: string, version: string): Promise<void> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).updateVersion(instanceId, version);
  const r = getRedis();
  const prevVersion = await r.hGet('versions:instances', instanceId);
  if (prevVersion === version) return;
  await r.hSet('versions:instances', instanceId, version);
  if (prevVersion) await r.hIncrBy('versions:counts', prevVersion, -1);
  await r.hIncrBy('versions:counts', version, 1);
}

export async function getVersionDistribution(): Promise<Record<string, number>> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).getVersionDistribution();
  const r = getRedis();
  const data = await r.hGetAll('versions:counts') as Record<string, string>;
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(data)) {
    const count = parseInt(v, 10);
    if (count > 0) result[k] = count;
  }
  return result;
}

export async function getOSDistribution(): Promise<Record<string, number>> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).getOSDistribution();
  const r = getRedis();
  const data = await r.hGetAll('os:counts') as Record<string, string>;
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(data)) {
    result[k] = parseInt(v, 10);
  }
  return result;
}

export async function pushEventStream(event: Record<string, unknown>): Promise<void> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).pushEventStream(event);
  const r = getRedis();
  await r.lPush('events:stream', JSON.stringify(event));
  await r.lTrim('events:stream', 0, 999);
}

export async function getEventStream(limit = 20): Promise<Record<string, unknown>[]> {
  if (process.env.LITE_MODE === '1') return (await getLiteModule()).getEventStream(limit);
  const r = getRedis();
  const items = await r.lRange('events:stream', 0, limit - 1);
  return items.map((item: string) => JSON.parse(item));
}

/**
 * ISO 8601 周编号：YYYY-Www
 * 使用 ISO 周定义（周四所在的周决定年份，周一为周起始日）
 */
function getWeekKey(): string {
  const now = new Date();
  // ISO week: 找到本周的周四（ISO 周由周四所在年份决定）
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Monday
  const thursday = new Date(now);
  thursday.setDate(now.getDate() - dayOfWeek + 3);
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${thursday.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}
