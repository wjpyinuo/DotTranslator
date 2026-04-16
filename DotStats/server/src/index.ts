import { createHash } from 'crypto';
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
import { validateEnv } from './env';

// 启动前校验环境变量（缺失或格式错误立即退出）
const env = validateEnv();

async function start(): Promise<void> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV !== 'production'
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
  const corsOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : false; // false = 禁止跨域（最安全的默认值）
  await app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  });

  // Rate limiting - 全局默认限制（健康检查通过 nginx 反代 bypass，无需单独豁免）
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    // 使用 API Key hash + IP 组合作为限流 key（避免前缀碰撞导致误限流）
    keyGenerator: (request) => {
      const apiKey = (request.headers['x-admin-key'] || request.headers['authorization'] || '') as string;
      if (apiKey) return createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
      return request.ip;
    },
    errorResponseBuilder: (_req, context) => ({
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${Math.ceil(context.ttl / 1000)}s`,
      statusCode: 429,
      retryAfter: Math.ceil(context.ttl / 1000),
    }),
  });

  // 初始化数据库和缓存
  await initDatabase();
  await initRedis();

  // WebSocket
  setupWebSocket(app);

  // Swagger API 文档（仅非生产环境或明确启用时）
  if (env.NODE_ENV !== 'production' || env.ENABLE_SWAGGER) {
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
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 Analytics Server running on http://${env.HOST}:${env.PORT}`);
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
      console.error(`⏰ Shutdown timeout (${env.SHUTDOWN_TIMEOUT_MS}ms), forcing exit`);
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);

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
        const redis = await getRedis();
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
