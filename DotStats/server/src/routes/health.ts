import type { FastifyInstance } from 'fastify';
import { getPool } from '../db/pool';
import { getRedis } from '../services/redis';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {};
    const isLite = process.env.LITE_MODE === '1';

    // DB 连通性
    try {
      const pool = getPool();
      await pool.query('SELECT 1');
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Redis 连通性
    try {
      const redis = getRedis();
      if (typeof redis.ping === 'function') {
        await redis.ping();
      }
      checks.cache = 'ok';
    } catch {
      checks.cache = 'error';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'healthy' : 'degraded',
      mode: isLite ? 'lite' : 'production',
      checks,
      timestamp: new Date().toISOString(),
    });
  });
}
