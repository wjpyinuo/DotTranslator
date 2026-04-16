import type { FastifyInstance } from 'fastify';
import { getPool } from '../db/pool';
import { sendError } from '../utils/reply';
import { statsViewAuth } from '../middleware/auth';
import {
  getOnlineCount, getDAU, getWAU, getFeatureCounts,
  getVersionDistribution, getOSDistribution, getEventStream,
} from '../services/redis';

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  // 所有 stats 端点共用认证中间件（未配置 STATS_VIEW_KEY 则放行）
  app.addHook('preHandler', statsViewAuth);

  // GET /api/v1/stats/realtime
  app.get('/stats/realtime', async (_request, _reply) => {
    const [onlineNow, todayActive, weekActive, topFeatures, versionDistribution, osDistribution, recentEvents] =
      await Promise.all([
        getOnlineCount(),
        getDAU(),
        getWAU(),
        getFeatureCounts(),
        getVersionDistribution(),
        getOSDistribution(),
        getEventStream(20),
      ]);

    return {
      onlineNow,
      todayActive,
      weekActive,
      topFeatures,
      versionDistribution,
      osDistribution,
      recentEvents,
    };
  });

  // GET /api/v1/stats/trend?from=2026-01-01&to=2026-04-15&granularity=day&metrics=dau,feature_calls
  app.get('/stats/trend', async (request, reply) => {
    const { from, to, granularity = 'day', metrics = 'dau' } = request.query as {
      from?: string; to?: string; granularity?: string; metrics?: string;
    };

    const pool = getPool();

    // 白名单：granularity → SQL 表达式（不允许外部拼接）
    const GRANULARITY_EXPR: Record<string, string> = {
      day: "date",
      week: "DATE_TRUNC('week', date)",
      month: "DATE_TRUNC('month', date)",
    };

    // 白名单：metric name → SQL column alias 映射（值完全内控，禁止外部拼接）
    const METRIC_SELECTS: Record<string, string> = {
      dau: 'AVG(dau) as dau',
      new_instances: 'AVG(new_instances) as new_instances',
      heartbeats: 'AVG(heartbeats) as heartbeats',
      feature_calls: 'AVG(feature_calls) as feature_calls',
    };

    const ALLOWED_METRIC_NAMES = new Set(Object.keys(METRIC_SELECTS));

    const dateGroup = GRANULARITY_EXPR[granularity!] || GRANULARITY_EXPR['day'];

    const metricList = (metrics || 'dau')
      .split(',')
      .map(m => m.trim())
      .filter(m => ALLOWED_METRIC_NAMES.has(m));

    if (metricList.length === 0) {
      return sendError(reply, 400, 'No valid metrics specified');
    }

    // 使用预定义映射拼接 SELECT，不直接引用用户输入
    const selectCols = metricList.map((m) => METRIC_SELECTS[m]).join(', ');

    const query = `
      SELECT ${dateGroup} as period, ${selectCols}
      FROM daily_metrics
      WHERE date >= $1 AND date <= $2
      GROUP BY period
      ORDER BY period ASC
    `;

    const result = await pool.query(query, [
      from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to || new Date().toISOString().split('T')[0],
    ]);

    return { data: result.rows };
  });

  // GET /api/v1/stats/features?period=30d&sort=total&limit=20
  app.get('/stats/features', async (request, _reply) => {
    const { period = '30d', sort = 'total', limit = '20' } = request.query as {
      period?: string; sort?: string; limit?: string;
    };

    const pool = getPool();
    const days = parseInt(period) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 白名单：ORDER BY 列名映射（防止 SQL 注入）
    const SORT_COLUMNS: Record<string, string> = {
      total: 'total_calls',
      users: 'unique_users',
    };
    const orderCol = SORT_COLUMNS[sort!] || SORT_COLUMNS['total'];

    const result = await pool.query(`
      SELECT feature, COUNT(*) as total_calls, COUNT(DISTINCT instance_id) as unique_users
      FROM events
      WHERE event_type = 'feature' AND received_at >= $1 AND feature IS NOT NULL
      GROUP BY feature
      ORDER BY ${orderCol} DESC
      LIMIT $2
    `, [since, parseInt(limit)]);

    return { data: result.rows };
  });

  // GET /api/v1/stats/retention?weeks=12
  app.get('/stats/retention', async (_request, _reply) => {
    const pool = getPool();
    const result = await pool.query(`
      SELECT * FROM retention_weekly ORDER BY cohort_week DESC LIMIT 12
    `);
    return { data: result.rows };
  });

  // GET /api/v1/stats/geo
  app.get('/stats/geo', async (_request, _reply) => {
    const pool = getPool();
    const result = await pool.query(`
      SELECT locale, COUNT(*) as count FROM instances GROUP BY locale ORDER BY count DESC
    `);
    return { data: result.rows };
  });

  // GET /api/v1/stats/versions?period=30d
  app.get('/stats/versions', async (_request, _reply) => {
    const distribution = await getVersionDistribution();
    return { data: distribution };
  });

  // GET /api/v1/stats/providers
  app.get('/stats/providers', async (_request, _reply) => {
    const pool = getPool();
    const result = await pool.query(`
      SELECT metadata->>'provider' as provider, COUNT(*) as count
      FROM events
      WHERE event_type = 'feature' AND metadata->>'provider' IS NOT NULL
      GROUP BY provider ORDER BY count DESC
    `);
    return { data: result.rows };
  });

  // GET /api/v1/stats/privacy
  app.get('/stats/privacy', async (_request, _reply) => {
    const pool = getPool();
    const result = await pool.query(`
      SELECT COUNT(*) as privacy_on FROM events WHERE feature = 'privacy_mode_on'
    `);
    return { data: result.rows[0] };
  });

  // GET /api/v1/stats/providers/metrics?period=30d
  app.get('/stats/providers/metrics', async (request, _reply) => {
    const { period = '30d' } = request.query as { period?: string };
    const days = parseInt(period) || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const pool = getPool();
    const result = await pool.query(`
      SELECT provider, date, total_calls, success, fail,
        CASE WHEN total_calls > 0 THEN total_latency / total_calls ELSE 0 END AS avg_latency
      FROM provider_metrics
      WHERE date >= $1
      ORDER BY date DESC, total_calls DESC
    `, [since]);
    return { data: result.rows };
  });
}
