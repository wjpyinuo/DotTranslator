import type { FastifyRequest, FastifyReply } from 'fastify';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * Admin API 认证 - 用于管理接口（数据导出、实例删除等）
 */
export async function adminAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!ADMIN_API_KEY) {
    reply.status(403).send({ error: 'Admin API not configured' });
    return;
  }

  const token = request.headers['x-admin-key'] as string
    || (request.query as any)?.admin_key;

  if (!token || token !== ADMIN_API_KEY) {
    reply.status(401).send({ error: 'Unauthorized: invalid or missing admin key' });
    return;
  }
}

/**
 * 遥测事件认证 - 用于 /api/v1/events 端点
 * 使用独立的 INGEST_API_KEY，与 admin key 分离（最小权限原则）
 * 如果未配置 INGEST_API_KEY，则拒绝所有请求（安全默认）
 */
const INGEST_API_KEY = process.env.INGEST_API_KEY;

export async function eventAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!INGEST_API_KEY) {
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

  if (!token || token !== INGEST_API_KEY) {
    reply.status(401).send({ error: 'Unauthorized: invalid or missing API key' });
    return;
  }
}
