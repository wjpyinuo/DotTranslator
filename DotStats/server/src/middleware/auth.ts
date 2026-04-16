import type { FastifyRequest, FastifyReply } from 'fastify';
import { timingSafeEqual } from 'crypto';

/**
 * 常量时间比较，防止时序攻击
 */
function safeCompare(token: string, expected: string): boolean {
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * Admin API 认证 - 用于管理接口（数据导出、实例删除等）
 */
export async function adminAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!adminApiKey) {
    reply.status(403).send({ error: 'Admin API not configured' });
    return;
  }

  const token = request.headers['x-admin-key'] as string
    || (request.query as any)?.admin_key;

  if (!token || !safeCompare(token, adminApiKey)) {
    reply.status(401).send({ error: 'Unauthorized: invalid or missing admin key' });
    return;
  }
}

/**
 * 遥测事件认证 - 用于 /api/v1/events 端点
 * 使用独立的 INGEST_API_KEY，与 admin key 分离（最小权限原则）
 * 如果未配置 INGEST_API_KEY，则拒绝所有请求（安全默认）
 */
/** 启动时记录一次的 stats 未认证警告标志 */
let statsNoAuthWarned = false;

/**
 * Stats 视图认证 - 用于 /api/v1/stats/* 端点
 * 如果配置了 STATS_VIEW_KEY 则要求认证；未配置时放行（向后兼容）并打印警告
 */
export async function statsViewAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const statsKey = process.env.STATS_VIEW_KEY;
  if (!statsKey) {
    if (!statsNoAuthWarned) {
      statsNoAuthWarned = true;
      console.warn('⚠️  STATS_VIEW_KEY not set — /api/v1/stats/* endpoints are open. Set STATS_VIEW_KEY for production.');
    }
    return; // 未配置则开放访问（向后兼容）
  }

  const token = request.headers['x-stats-key'] as string
    || (request.query as Record<string, unknown>)?.stats_key as string;

  if (!token || !safeCompare(token, statsKey)) {
    reply.status(401).send({ error: 'Unauthorized: invalid or missing stats key' });
    return;
  }
}

export async function eventAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const ingestApiKey = process.env.INGEST_API_KEY;

  if (!ingestApiKey) {
    reply.status(503).send({
      error: 'Event ingestion not configured',
      message: 'Set INGEST_API_KEY environment variable to enable event collection',
    });
    return;
  }

  const authHeader = request.headers['authorization'] as string || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (request.headers['x-api-key'] as string);

  if (!token || !safeCompare(token, ingestApiKey)) {
    reply.status(401).send({ error: 'Unauthorized: invalid or missing API key' });
    return;
  }
}
