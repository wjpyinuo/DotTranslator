import Fastify from 'fastify';
import cors from '@fastify/cors';
import { eventRoutes } from './routes/events';
import { statsRoutes } from './routes/stats';
import { adminRoutes } from './routes/admin';
import { healthRoutes } from './routes/health';
import { initDatabase } from './db/pool';
import { initRedis } from './services/redis';
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
}

start();
