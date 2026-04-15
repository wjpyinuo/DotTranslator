import { createClient } from 'redis';
let redis = null;
export async function initRedis() {
    if (redis)
        return redis;
    redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    redis.on('error', (err) => console.error('Redis error:', err));
    await redis.connect();
    return redis;
}
export function getRedis() {
    if (!redis)
        throw new Error('Redis not initialized');
    return redis;
}
// ==================== 实时在线 ====================
export async function setOnline(instanceId) {
    const r = getRedis();
    await r.zAdd('online:instances', { score: Date.now(), value: instanceId });
}
export async function getOnlineCount(windowMs = 5 * 60 * 1000) {
    const r = getRedis();
    return r.zCount('online:instances', Date.now() - windowMs, '+inf');
}
export async function cleanExpiredOnline() {
    const r = getRedis();
    await r.zRemRangeByScore('online:instances', 0, Date.now() - 10 * 60 * 1000);
}
// ==================== DAU / WAU ====================
export async function addToDAU(instanceId) {
    const r = getRedis();
    const today = new Date().toISOString().split('T')[0];
    await r.pfAdd(`dau:${today}`, instanceId);
}
export async function getDAU(date) {
    const r = getRedis();
    const d = date || new Date().toISOString().split('T')[0];
    return r.pfCount(`dau:${d}`);
}
export async function addToWAU(instanceId) {
    const r = getRedis();
    const week = getWeekKey();
    await r.pfAdd(`wau:${week}`, instanceId);
}
export async function getWAU() {
    const r = getRedis();
    return r.pfCount(`wau:${getWeekKey()}`);
}
// ==================== 功能计数 ====================
export async function incrementFeature(feature) {
    const r = getRedis();
    const today = new Date().toISOString().split('T')[0];
    await r.hIncrBy(`features:${today}`, feature, 1);
}
export async function getFeatureCounts(date) {
    const r = getRedis();
    const d = date || new Date().toISOString().split('T')[0];
    const data = await r.hGetAll(`features:${d}`);
    const result = {};
    for (const [k, v] of Object.entries(data)) {
        result[k] = parseInt(v, 10);
    }
    return result;
}
// ==================== 版本/OS 分布 ====================
export async function updateVersion(instanceId, version) {
    const r = getRedis();
    const prevVersion = await r.hGet('versions:instances', instanceId);
    if (prevVersion === version)
        return; // 版本未变，跳过
    // 更新实例版本映射
    await r.hSet('versions:instances', instanceId, version);
    // 旧版本计数减 1，新版本计数加 1
    if (prevVersion) {
        await r.hIncrBy('versions:counts', prevVersion, -1);
    }
    await r.hIncrBy('versions:counts', version, 1);
}
export async function getVersionDistribution() {
    const r = getRedis();
    const data = await r.hGetAll('versions:counts');
    const result = {};
    for (const [k, v] of Object.entries(data)) {
        const count = parseInt(v, 10);
        if (count > 0)
            result[k] = count;
    }
    return result;
}
export async function getOSDistribution() {
    const r = getRedis();
    const data = await r.hGetAll('os:counts');
    const result = {};
    for (const [k, v] of Object.entries(data)) {
        result[k] = parseInt(v, 10);
    }
    return result;
}
// ==================== 事件流 ====================
export async function pushEventStream(event) {
    const r = getRedis();
    await r.lPush('events:stream', JSON.stringify(event));
    await r.lTrim('events:stream', 0, 999);
}
export async function getEventStream(limit = 20) {
    const r = getRedis();
    const items = await r.lRange('events:stream', 0, limit - 1);
    return items.map((item) => JSON.parse(item));
}
// ==================== 辅助 ====================
function getWeekKey() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}
