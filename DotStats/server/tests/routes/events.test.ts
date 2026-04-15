import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// Mock 外部依赖
vi.mock('../../src/db/pool', () => ({
  getPool: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
  })),
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/redis', () => ({
  getRedis: vi.fn(() => ({
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue(undefined),
  })),
  initRedis: vi.fn().mockResolvedValue(undefined),
  setOnline: vi.fn().mockResolvedValue(undefined),
  addToDAU: vi.fn().mockResolvedValue(undefined),
  addToWAU: vi.fn().mockResolvedValue(undefined),
  incrementFeature: vi.fn().mockResolvedValue(undefined),
  updateVersion: vi.fn().mockResolvedValue(undefined),
  pushEventStream: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/websocket', () => ({
  setupWebSocket: vi.fn(),
  broadcastEvent: vi.fn().mockResolvedValue(undefined),
}));

import { eventRoutes } from '../../src/routes/events';

describe('POST /events', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(eventRoutes);
    await app.ready();
  });

  it('应该拒绝空请求体', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('Invalid payload');
  });

  it('应该拒绝 events 数组超限 (>50)', async () => {
    const events = Array.from({ length: 51 }, (_, i) => ({
      type: 'heartbeat',
      timestamp: Date.now(),
      payload: { instanceId: 'test-123', version: '1.0.0' },
    }));

    const res = await app.inject({
      method: 'POST',
      url: '/events',
      payload: { events },
    });
    expect(res.statusCode).toBe(400);
  });

  it('应该拒绝缺少 instanceId 的请求', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      payload: {
        events: [{
          type: 'heartbeat',
          timestamp: Date.now(),
          payload: { version: '1.0.0' }, // 缺少 instanceId
        }],
      },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('Invalid payload');
  });

  it('应该接受合法的 heartbeat 事件', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      payload: {
        events: [{
          type: 'heartbeat',
          timestamp: Date.now(),
          payload: { instanceId: 'test-123', version: '1.0.0', os: 'win32' },
        }],
      },
    });
    expect(res.statusCode).toBe(204);
  });

  it('应该接受合法的 feature 事件', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      payload: {
        events: [{
          type: 'feature',
          timestamp: Date.now(),
          payload: {
            instanceId: 'test-456',
            version: '1.1.0',
            feature: 'translate',
            metadata: { provider: 'deepl', latencyMs: 200 },
          },
        }],
      },
    });
    expect(res.statusCode).toBe(204);
  });

  it('应该拒绝非法的 event type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      payload: {
        events: [{
          type: 'invalid_type',
          timestamp: Date.now(),
          payload: { instanceId: 'test-789', version: '1.0.0' },
        }],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('应该从 header 读取 x-instance-id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/events',
      headers: { 'x-instance-id': 'header-instance' },
      payload: {
        events: [{
          type: 'heartbeat',
          timestamp: Date.now(),
          payload: { instanceId: 'header-instance', version: '1.0.0' },
        }],
      },
    });
    expect(res.statusCode).toBe(204);
  });
});
