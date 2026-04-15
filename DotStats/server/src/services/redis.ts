import { createClient, type RedisClientType } from 'redis';

let redis: RedisClientType | null = null;

export async function initRedis(): Promise<RedisClientType | void> {
  if (process.env.LITE_MODE === '1') {
    const lite = await import('./lite-redis');
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

// 轻量模式代理
function getLiteModule() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./lite-redis');
}

export function getRedis() {
  if (process.env.LITE_MODE === '1') return getLiteModule().getRedis();
  if (!redis) throw new Error('Redis not initialized');
  return redis;
}

export async function setOnline(instanceId: string): Promise<void> {
  if (process.env.LITE_MODE === '1') return getLiteModule().setOnline(instanceId);
  const r = getRedis();
  await r.zAdd('online:instances', { score: Date.now(), value: instanceId });
}

export async function getOnlineCount(windowMs = 5 * 60 * 1000): Promise<number> {
  if (process.env.LITE_MODE === '1') return getLiteModule().getOnlineCount(windowMs);
  const r = getRedis();
  return r.zCount('online:instances', Date.now() - windowMs, '+inf');
}

export async function cleanExpiredOnline(): Promise<void> {
  if (process.env.LITE_MODE === '1') return getLiteModule().cleanExpiredOnline();
  const r = getRedis();
  await r.zRemRangeByScore('online:instances', 0, Date.now() - 10 * 60 * 1000);
}

export async function addToDAU(instanceId: string): Promise<void> {
  if (process.env.LITE_MODE === '1') return getLiteModule().addToDAU(instanceId);
  const r = getRedis();
  const today = new Date().toISOString().split('T')[0];
  await r.pfAdd(`dau:${today}`, instanceId);
}

export async function getDAU(date?: string): Promise<number> {
  if (process.env.LITE_MODE === '1') return getLiteModule().getDAU(date);
  const r = getRedis();
  const d = date || new Date().toISOString().split('T')[0];
  return r.pfCount(`dau:${d}`);
}

export async function addToWAU(instanceId: string): Promise<void> {
  if (process.env.LITE_MODE === '1') return getLiteModule().addToWAU(instanceId);
  const r = getRedis();
  const week = getWeekKey();
  await r.pfAdd(`wau:${week}`, instanceId);
}

export async function getWAU(): Promise<number> {
  if (process.env.LITE_MODE === '1') return getLiteModule().getWAU();
  const r = getRedis();
  return r.pfCount(`wau:${getWeekKey()}`);
}

export async function incrementFeature(feature: string): Promise<void> {
  if (process.env.LITE_MODE === '1') return getLiteModule().incrementFeature(feature);
  const r = getRedis();
  const today = new Date().toISOString().split('T')[0];
  await r.hIncrBy(`features:${today}`, feature, 1);
}

export async function getFeatureCounts(date?: string): Promise<Record<string, number>> {
  if (process.env.LITE_MODE === '1') return getLiteModule().getFeatureCounts(date);
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
  if (process.env.LITE_MODE === '1') return getLiteModule().updateVersion(instanceId, version);
  const r = getRedis();
  const prevVersion = await r.hGet('versions:instances', instanceId);
  if (prevVersion === version) return;
  await r.hSet('versions:instances', instanceId, version);
  if (prevVersion) await r.hIncrBy('versions:counts', prevVersion, -1);
  await r.hIncrBy('versions:counts', version, 1);
}

export async function getVersionDistribution(): Promise<Record<string, number>> {
  if (process.env.LITE_MODE === '1') return getLiteModule().getVersionDistribution();
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
  if (process.env.LITE_MODE === '1') return getLiteModule().getOSDistribution();
  const r = getRedis();
  const data = await r.hGetAll('os:counts') as Record<string, string>;
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(data)) {
    result[k] = parseInt(v, 10);
  }
  return result;
}

export async function pushEventStream(event: Record<string, unknown>): Promise<void> {
  if (process.env.LITE_MODE === '1') return getLiteModule().pushEventStream(event);
  const r = getRedis();
  await r.lPush('events:stream', JSON.stringify(event));
  await r.lTrim('events:stream', 0, 999);
}

export async function getEventStream(limit = 20): Promise<Record<string, unknown>[]> {
  if (process.env.LITE_MODE === '1') return getLiteModule().getEventStream(limit);
  const r = getRedis();
  const items = await r.lRange('events:stream', 0, limit - 1);
  return items.map((item: string) => JSON.parse(item));
}

function getWeekKey(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}
