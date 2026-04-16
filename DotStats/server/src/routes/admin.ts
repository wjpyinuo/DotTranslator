import type { FastifyInstance } from 'fastify';
import { getPool } from '../db/pool';
import { z } from 'zod';
import { adminAuth } from '../middleware/auth';
import { sendError } from '../utils/reply';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // DELETE /api/v1/instances/:id - GDPR 级联删除 (需认证)
  const deleteParamsSchema = z.object({ id: z.string().uuid() });
  const exportQuerySchema = z.object({
    format: z.enum(['csv', 'json']).default('csv'),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  });

  app.delete('/instances/:id', { preHandler: adminAuth }, async (request, reply) => {
    const parsed = deleteParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError(reply, 400, 'Invalid instance ID', parsed.error.issues);
    }
    const { id } = parsed.data;
    const pool = getPool();

    await pool.query('BEGIN');
    try {
      // events 表有 ON DELETE CASCADE，只需删除 instance 即可
      await pool.query('DELETE FROM instances WHERE instance_id = $1', [id]);
      await pool.query('COMMIT');
      return { success: true, message: `Instance ${id} deleted` };
    } catch (err) {
      await pool.query('ROLLBACK');
      app.log.error(err);
      return sendError(reply, 500, 'Delete failed');
    }
  });

  // GET /api/v1/admin/export?format=csv&from=2026-04-01&to=2026-04-15 (需认证)
  app.get('/admin/export', { preHandler: adminAuth }, async (request, reply) => {
    const parsed = exportQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError(reply, 400, 'Invalid query parameters', parsed.error.issues);
    }
    const { format, from, to } = parsed.data;

    const pool = getPool();
    const result = await pool.query(`
      SELECT date, dau, new_instances, heartbeats, feature_calls
      FROM daily_metrics
      WHERE date >= $1 AND date <= $2
      ORDER BY date ASC
    `, [from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to || new Date().toISOString().split('T')[0]]);

    if (format === 'csv') {
      const header = 'date,dau,new_instances,heartbeats,feature_calls\n';
      const rows = result.rows.map((r: any) =>
        `${r.date},${r.dau},${r.new_instances},${r.heartbeats},${r.feature_calls}`
      ).join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="dotstats-export.csv"');
      return header + rows;
    }

    return { data: result.rows };
  });

  // ========== Alert Rules CRUD ==========

  const alertRuleSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    metric: z.enum(['online_now', 'dau', 'dau_drop_pct', 'error_rate']),
    operator: z.enum(['>', '<', '>=', '<=', '==']),
    threshold: z.number(),
    window_hours: z.number().int().positive().default(24),
    notify_channel: z.enum(['webhook']).default('webhook'),
    notify_target: z.string().optional().default(''),
    is_enabled: z.boolean().default(true),
    cooldown_minutes: z.number().int().positive().default(60),
  });

  // GET /api/v1/admin/alerts
  app.get('/admin/alerts', { preHandler: adminAuth }, async (_request, reply) => {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM alert_rules ORDER BY name ASC');
    return { data: result.rows };
  });

  // POST /api/v1/admin/alerts (创建或更新)
  app.post('/admin/alerts', { preHandler: adminAuth }, async (request, reply) => {
    const parsed = alertRuleSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'Invalid payload', parsed.error.issues);
    }
    const rule = parsed.data;
    const id = rule.id || crypto.randomUUID();
    const pool = getPool();

    await pool.query(`
      INSERT INTO alert_rules (id, name, metric, operator, threshold, window_hours, notify_channel, notify_target, is_enabled, cooldown_minutes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        metric = EXCLUDED.metric,
        operator = EXCLUDED.operator,
        threshold = EXCLUDED.threshold,
        window_hours = EXCLUDED.window_hours,
        notify_channel = EXCLUDED.notify_channel,
        notify_target = EXCLUDED.notify_target,
        is_enabled = EXCLUDED.is_enabled,
        cooldown_minutes = EXCLUDED.cooldown_minutes
    `, [id, rule.name, rule.metric, rule.operator, rule.threshold, rule.window_hours, rule.notify_channel, rule.notify_target, rule.is_enabled, rule.cooldown_minutes]);

    return { success: true, id };
  });

  // PATCH /api/v1/admin/alerts/:id
  app.patch('/admin/alerts/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const pool = getPool();

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(body)) {
      if (['name', 'metric', 'operator', 'threshold', 'window_hours', 'notify_channel', 'notify_target', 'is_enabled', 'cooldown_minutes'].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return sendError(reply, 400, 'No valid fields to update');
    }

    values.push(id);
    await pool.query(
      `UPDATE alert_rules SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );

    return { success: true };
  });

  // DELETE /api/v1/admin/alerts/:id
  app.delete('/admin/alerts/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pool = getPool();
    await pool.query('DELETE FROM alert_rules WHERE id = $1', [id]);
    return { success: true };
  });
}

