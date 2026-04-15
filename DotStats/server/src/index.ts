import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { eventRoutes } from './routes/events';
import { statsRoutes } from './routes/stats';
import { adminRoutes } from './routes/admin';
import { healthRoutes } from './routes/health';
import { initDatabase, getPool } from './db/pool';
import { initRedis, getRedis } from './services/redis';
import { setupWebSocket } from './services/websocket';
import { startCronJobs } from './tasks/cron';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start(): Promise<void> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // CORS - 默认仅允许同源，生产环境须通过 CORS_ORIGIN 环境变量指定允许的域名
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : false; // false = 禁止跨域（最安全的默认值）
  await app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  });

  // Rate limiting - 防止 API 被刷
  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    errorResponseBuilder: (_req, context) => ({
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${Math.ceil(context.ttl / 1000)}s`,
      statusCode: 429,
    }),
  });

  // 初始化数据库和缓存
  await initDatabase();
  await initRedis();

  // WebSocket
  setupWebSocket(app);

  // 路由
  await app.register(eventRoutes, { prefix: '/api/v1' });
  await app.register(statsRoutes, { prefix: '/api/v1' });
  await app.register(adminRoutes, { prefix: '/api/v1' });
  await app.register(healthRoutes, { prefix: '/api/v1' });

  // 定时任务
  startCronJobs();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 Analytics Server running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // 优雅关闭
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      const pool = getPool();
      await pool.end();
      const redis = getRedis();
      await redis.quit();
      console.log('✅ Cleanup complete');
      process.exit(0);
    } catch (err) {
      console.error('❌ Shutdown error:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
