import type { FastifyInstance } from 'fastify';
import { getPool } from '../db/pool';
import { getRedis } from '../services/redis';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {};

    // DB 连通性
    try {
      const pool = getPool();
      await pool.query('SELECT 1');
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'error';
    }

    // Redis 连通性
    try {
      const redis = getRedis();
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  });
}
