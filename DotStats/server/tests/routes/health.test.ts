import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

vi.mock('../../src/db/pool', () => ({
  getPool: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
  })),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/redis', () => ({
  getRedis: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
  })),
  initRedis: vi.fn().mockResolvedValue(undefined),
}));

import { healthRoutes } from '../../src/routes/health';

describe('GET /health', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(healthRoutes);
    await app.ready();
  });

  it('应该返回 200 healthy', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('healthy');
    expect(body.checks.database).toBe('ok');
    expect(body.checks.cache).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('应该在 PG 失败时返回 503 degraded', async () => {
    // 重新 mock 使 PG 失败
    vi.resetModules();
    vi.doMock('../../src/db/pool', () => ({
      getPool: vi.fn(() => ({
        query: vi.fn().mockRejectedValue(new Error('connection refused')),
      })),
    }));
    vi.doMock('../../src/services/redis', () => ({
      getRedis: vi.fn(() => ({
        ping: vi.fn().mockResolvedValue('PONG'),
      })),
    }));

    const { healthRoutes: routes } = await import('../../src/routes/health');
    const testApp = Fastify({ logger: false });
    await testApp.register(routes);
    await testApp.ready();

    const res = await testApp.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.status).toBe('degraded');
    expect(body.checks.database).toBe('error');
  });
});
