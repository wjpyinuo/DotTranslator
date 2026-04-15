import cron from 'node-cron';
import { getPool } from '../db/pool';
import { cleanExpiredOnline } from '../services/redis';
import { checkAlerts } from './alerts';

export function startCronJobs(): void {
  // 每 10 分钟清理过期在线状态
  cron.schedule('*/10 * * * *', async () => {
    try {
      await cleanExpiredOnline();
      console.log('[Cron] Cleaned expired online instances');
    } catch (err) {
      console.error('[Cron] cleanExpiredOnline failed:', err);
    }
  });

  // 每天凌晨 2:00 - 日聚合
  cron.schedule('0 2 * * *', async () => {
    try {
      const pool = getPool();
      await pool.query(`
        INSERT INTO daily_metrics (
          date, dau, new_instances, heartbeats, feature_calls,
          version_distribution, os_distribution, locale_distribution, feature_breakdown
        )
        SELECT
          DATE(received_at) AS date,
          COUNT(DISTINCT instance_id) AS dau,
          COUNT(DISTINCT instance_id) FILTER (
            WHERE instance_id IN (
              SELECT instance_id FROM instances WHERE first_seen::date = DATE(received_at)
            )
          ) AS new_instances,
          COUNT(*) FILTER (WHERE event_type = 'heartbeat') AS heartbeats,
          COUNT(*) FILTER (WHERE event_type = 'feature') AS feature_calls,
          '{}'::jsonb AS version_distribution,
          '{}'::jsonb AS os_distribution,
          '{}'::jsonb AS locale_distribution,
          COALESCE((
            SELECT jsonb_object_agg(feature, cnt)
            FROM (
              SELECT feature, COUNT(*) AS cnt
              FROM events e2
              WHERE e2.event_type = 'feature'
                AND DATE(e2.received_at) = DATE(events.received_at)
              GROUP BY feature
            ) feature_counts
          ), '{}'::jsonb) AS feature_breakdown
        FROM events
        WHERE received_at >= CURRENT_DATE - INTERVAL '1 day'
          AND received_at < CURRENT_DATE
        GROUP BY DATE(received_at)
        ON CONFLICT (date) DO UPDATE SET
          dau = EXCLUDED.dau,
          feature_calls = EXCLUDED.feature_calls,
          feature_breakdown = EXCLUDED.feature_breakdown
      `);
      console.log('[Cron] Daily aggregation completed');
    } catch (err) {
      console.error('[Cron] Daily aggregation failed:', err);
    }
  });

  // 每天凌晨 4:00 - 标记不活跃实例
  cron.schedule('0 4 * * *', async () => {
    try {
      const pool = getPool();
      await pool.query(`
        UPDATE instances SET is_active = FALSE
        WHERE last_seen < NOW() - INTERVAL '30 days' AND is_active = TRUE
      `);
      console.log('[Cron] Marked inactive instances');
    } catch (err) {
      console.error('[Cron] Mark inactive failed:', err);
    }
  });

  // 每月 1 号凌晨 5:00 - 归档旧事件
  cron.schedule('0 5 1 * *', async () => {
    try {
      const pool = getPool();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      await pool.query('DELETE FROM events WHERE received_at < $1', [sixMonthsAgo]);
      console.log('[Cron] Archived old events');
    } catch (err) {
      console.error('[Cron] Archive failed:', err);
    }
  });

  // 每 5 分钟检查告警规则
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkAlerts();
    } catch (err) {
      console.error('[Cron] Alert check failed:', err);
    }
  });

  console.log('[Cron] All scheduled jobs started');
}
