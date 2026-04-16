import { z } from 'zod';

/**
 * 启动时校验环境变量，缺失或格式错误立即报错退出
 * 避免运行时才发现配置问题
 */
export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url().optional(),
  DB_PASSWORD: z.string().min(1).optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Auth
  ADMIN_API_KEY: z.string().min(8).optional(),
  INGEST_API_KEY: z.string().min(8).optional(),
  WS_TOKEN: z.string().min(8).optional(),

  // CORS
  CORS_ORIGIN: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(10000).default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  // LITE_MODE: 无 Redis / PostgreSQL 时启用 SQLite 回退
  LITE_MODE: z.coerce.boolean().default(false),

  // Swagger
  ENABLE_SWAGGER: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

/**
 * 校验并解析环境变量，失败时打印详细错误并退出
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  ${issue.path.join('.')}: ${issue.message}`
    );
    console.error('❌ Environment validation failed:');
    errors.forEach((e) => console.error(e));
    process.exit(1);
  }

  // 安全警告：非 LITE 模式下检查关键配置
  if (!result.data.LITE_MODE) {
    if (!result.data.DATABASE_URL && !result.data.DB_PASSWORD) {
      console.warn(
        '⚠️  No DATABASE_URL or DB_PASSWORD set. ' +
        'Set LITE_MODE=1 for SQLite-only mode or configure PostgreSQL.'
      );
    }
    if (!result.data.REDIS_URL) {
      console.warn(
        '⚠️  No REDIS_URL set. Realtime stats will fall back to PostgreSQL queries.'
      );
    }
  }

  return result.data;
}
