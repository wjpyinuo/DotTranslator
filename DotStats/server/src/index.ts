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
import { startCronJobs, stopCronJobs } from './tasks/cron';
import { setupSwagger } from './swagger';

const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

async function start(): Promise<void> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
        : undefined,
      serializers: {
        req(request) {
          return { method: request.method, url: request.url, id: request.id };
        },
        res(reply) {
          return { statusCode: reply.statusCode };
        },
      },
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

  // Rate limiting - 全局默认限制
  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    // 健康检查路由豁免限流
    routeConfig: {
      health: { rateLimit: false },
    },
    // 使用 API Key + IP 组合作为限流 key（已认证用户按 key 限流，未认证按 IP）
    keyGenerator: (request) => {
      const apiKey = (request.headers['x-admin-key'] || request.headers['authorization'] || '') as string;
      if (apiKey) return apiKey.slice(0, 32); // 前 32 字符作为 key
      return request.ip;
    },
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

  // Swagger API 文档（仅非生产环境或明确启用时）
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === '1') {
    await setupSwagger(app);
  }

  // 路由
  await app.register(eventRoutes, { prefix: '/api/v1' });
  await app.register(statsRoutes, { prefix: '/api/v1' });
  await app.register(adminRoutes, { prefix: '/api/v1' });
  await app.register(healthRoutes, { prefix: '/api/v1' });

  // Custom 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
      docs: '/api/v1/health',
    });
  });

  // 定时任务
  startCronJobs();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 Analytics Server running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // 优雅关闭（带超时保护）
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

    // 超时强制退出
    const forceTimer = setTimeout(() => {
      console.error(`⏰ Shutdown timeout (${SHUTDOWN_TIMEOUT_MS}ms), forcing exit`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      // 1. 停止定时任务（防止新任务启动）
      stopCronJobs();

      // 2. 关闭 Fastify（停止接受新请求，关闭 WS 连接）
      await app.close();

      // 3. 关闭数据库连接
      try {
        const pool = getPool();
        if (typeof pool.end === 'function') await pool.end();
      } catch { /* 轻量模式无需关闭 */ }

      // 4. 关闭 Redis
      try {
        const redis = getRedis();
        if (typeof redis.quit === 'function') await redis.quit();
      } catch { /* 轻量模式无需关闭 */ }

      clearTimeout(forceTimer);
      console.log('✅ Cleanup complete');
      process.exit(0);
    } catch (err) {
      clearTimeout(forceTimer);
      console.error('❌ Shutdown error:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
