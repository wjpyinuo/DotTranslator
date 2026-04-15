import { getPool } from '../db/pool';
import { adminAuth } from '../middleware/auth';
export async function adminRoutes(app) {
    // DELETE /api/v1/instances/:id - GDPR 级联删除 (需认证)
    app.delete('/instances/:id', { preHandler: adminAuth }, async (request, reply) => {
        const { id } = request.params;
        const pool = getPool();
        await pool.query('BEGIN');
        try {
            // events 表有 ON DELETE CASCADE，只需删除 instance 即可
            await pool.query('DELETE FROM instances WHERE instance_id = $1', [id]);
            await pool.query('COMMIT');
            return { success: true, message: `Instance ${id} deleted` };
        }
        catch (err) {
            await pool.query('ROLLBACK');
            app.log.error(err);
            return reply.status(500).send({ error: 'Delete failed' });
        }
    });
    // GET /api/v1/admin/export?format=csv&from=2026-04-01&to=2026-04-15 (需认证)
    app.get('/admin/export', { preHandler: adminAuth }, async (request, reply) => {
        const { format = 'csv', from, to } = request.query;
        const pool = getPool();
        const result = await pool.query(`
      SELECT date, dau, new_instances, heartbeats, feature_calls
      FROM daily_metrics
      WHERE date >= $1 AND date <= $2
      ORDER BY date ASC
    `, [from || '2020-01-01', to || new Date().toISOString().split('T')[0]]);
        if (format === 'csv') {
            const header = 'date,dau,new_instances,heartbeats,feature_calls\n';
            const rows = result.rows.map((r) => `${r.date},${r.dau},${r.new_instances},${r.heartbeats},${r.feature_calls}`).join('\n');
            reply.header('Content-Type', 'text/csv');
            reply.header('Content-Disposition', 'attachment; filename="dotstats-export.csv"');
            return header + rows;
        }
        return { data: result.rows };
    });
}
