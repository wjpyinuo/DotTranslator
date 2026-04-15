import type { FastifyInstance } from 'fastify';
import { getPool } from '../db/pool';
import { z } from 'zod';
import { adminAuth } from '../middleware/auth';

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
      return reply.status(400).send({ error: 'Invalid instance ID', details: parsed.error.issues });
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
      return reply.status(500).send({ error: 'Delete failed' });
    }
  });

  // GET /api/v1/admin/export?format=csv&from=2026-04-01&to=2026-04-15 (需认证)
  app.get('/admin/export', { preHandler: adminAuth }, async (request, reply) => {
    const parsed = exportQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query parameters', details: parsed.error.issues });
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
}
