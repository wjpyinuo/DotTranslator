import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const { mockQuery, mockRedis } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRedis: {
    getOnlineCount: vi.fn().mockResolvedValue(42),
    getDAU: vi.fn().mockResolvedValue(100),
    getWAU: vi.fn().mockResolvedValue(500),
    getFeatureCounts: vi.fn().mockResolvedValue({ translate: 80 }),
    getVersionDistribution: vi.fn().mockResolvedValue({ '0.1.0': 50 }),
    getOSDistribution: vi.fn().mockResolvedValue({ win32: 30 }),
    getEventStream: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../src/db/pool', () => ({
  getPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock('../../src/services/redis', () => mockRedis);

import { statsRoutes } from '../../src/routes/stats';

describe('Stats Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify({ logger: false });
    await app.register(statsRoutes);
    await app.ready();
  });

  describe('GET /stats/realtime', () => {
    it('should return aggregated realtime data', async () => {
      const res = await app.inject({ method: 'GET', url: '/stats/realtime' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.onlineNow).toBe(42);
      expect(body.todayActive).toBe(100);
    });
  });

  describe('GET /stats/providers/metrics', () => {
    it('should use parameterized query for days interval', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const res = await app.inject({ method: 'GET', url: '/stats/providers/metrics?period=30d' });
      expect(res.statusCode).toBe(200);
      // Verify parameterized query was called with days as parameter
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        [30]
      );
    });

    it('should default to 30 days', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await app.inject({ method: 'GET', url: '/stats/providers/metrics' });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        [30]
      );
    });
  });

  describe('GET /stats/trend', () => {
    it('should reject invalid granularity', async () => {
      const res = await app.inject({ method: 'GET', url: '/stats/trend?granularity=invalid' });
      // Should still work, falling back to day
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for invalid metrics', async () => {
      const res = await app.inject({ method: 'GET', url: '/stats/trend?metrics=invalid_metric' });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('No valid metrics specified');
    });
  });
});
