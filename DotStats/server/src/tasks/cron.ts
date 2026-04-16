import cron from 'node-cron';
import { getPool } from '../db/pool';
import { cleanExpiredOnline } from '../services/redis';
import { checkAlerts } from './alerts';

const scheduledTasks: cron.ScheduledTask[] = [];

export function startCronJobs(): void {
  // 每 10 分钟清理过期在线状态
  scheduledTasks.push(
    cron.schedule('*/10 * * * *', async () => {
      try {
        await cleanExpiredOnline();
        console.log('[Cron] Cleaned expired online instances');
      } catch (err) {
        console.error('[Cron] cleanExpiredOnline failed:', err);
      }
    })
  );

  // 每周凌晨 3:00 周一 - 周留存计算
  scheduledTasks.push(
    cron.schedule('0 3 * * 1', async () => {
      try {
        const pool = getPool();
        await pool.query(`
          INSERT INTO retention_weekly (cohort_week, cohort_size, w1_retained, w2_retained, w4_retained, w8_retained, w12_retained)
          SELECT
            TO_CHAR(DATE_TRUNC('week', first_seen), 'IYYY-IWW') AS cohort_week,
            COUNT(DISTINCT i.instance_id) AS cohort_size,
            COUNT(DISTINCT CASE WHEN e.received_at >= DATE_TRUNC('week', i.first_seen) + INTERVAL '1 week'
                                 AND e.received_at <  DATE_TRUNC('week', i.first_seen) + INTERVAL '2 weeks'
              THEN e.instance_id END) AS w1_retained,
            COUNT(DISTINCT CASE WHEN e.received_at >= DATE_TRUNC('week', i.first_seen) + INTERVAL '2 weeks'
                                 AND e.received_at <  DATE_TRUNC('week', i.first_seen) + INTERVAL '3 weeks'
              THEN e.instance_id END) AS w2_retained,
            COUNT(DISTINCT CASE WHEN e.received_at >= DATE_TRUNC('week', i.first_seen) + INTERVAL '4 weeks'
                                 AND e.received_at <  DATE_TRUNC('week', i.first_seen) + INTERVAL '5 weeks'
              THEN e.instance_id END) AS w4_retained,
            COUNT(DISTINCT CASE WHEN e.received_at >= DATE_TRUNC('week', i.first_seen) + INTERVAL '8 weeks'
                                 AND e.received_at <  DATE_TRUNC('week', i.first_seen) + INTERVAL '9 weeks'
              THEN e.instance_id END) AS w8_retained,
            COUNT(DISTINCT CASE WHEN e.received_at >= DATE_TRUNC('week', i.first_seen) + INTERVAL '12 weeks'
                                 AND e.received_at <  DATE_TRUNC('week', i.first_seen) + INTERVAL '13 weeks'
              THEN e.instance_id END) AS w12_retained
          FROM instances i
          LEFT JOIN events e ON e.instance_id = i.instance_id
          WHERE i.first_seen >= NOW() - INTERVAL '16 weeks'
          GROUP BY cohort_week
          ON CONFLICT (cohort_week) DO UPDATE SET
            cohort_size = EXCLUDED.cohort_size,
            w1_retained = EXCLUDED.w1_retained,
            w2_retained = EXCLUDED.w2_retained,
            w4_retained = EXCLUDED.w4_retained,
            w8_retained = EXCLUDED.w8_retained,
            w12_retained = EXCLUDED.w12_retained
        `);
        console.log('[Cron] Weekly retention calculation completed');
      } catch (err) {
        console.error('[Cron] Weekly retention failed:', err);
      }
    })
  );

  // 每天凌晨 2:00 - 日聚合
  scheduledTasks.push(
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
    })
  );

  // 每天凌晨 4:00 - 标记不活跃实例
  scheduledTasks.push(
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
    })
  );

  // 每月 1 号凌晨 5:00 - 归档旧事件 + 清理旧留存数据
  scheduledTasks.push(
    cron.schedule('0 5 1 * *', async () => {
      try {
        const pool = getPool();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        await pool.query('DELETE FROM events WHERE received_at < $1', [sixMonthsAgo]);
        console.log('[Cron] Archived old events');

        // 清理 16 周以上的留存快照（W12 已过期，无需保留）
        const sixteenWeeksAgo = new Date();
        sixteenWeeksAgo.setDate(sixteenWeeksAgo.getDate() - 112);
        const cutoffWeek = `${sixteenWeeksAgo.getFullYear()}-W${String(Math.ceil((sixteenWeeksAgo.getTime() - new Date(sixteenWeeksAgo.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`;
        await pool.query('DELETE FROM retention_weekly WHERE cohort_week < $1', [cutoffWeek]);
        console.log('[Cron] Cleaned old retention snapshots');
      } catch (err) {
        console.error('[Cron] Archive failed:', err);
      }
    })
  );

  // 每 5 分钟检查告警规则
  scheduledTasks.push(
    cron.schedule('*/5 * * * *', async () => {
      try {
        await checkAlerts();
      } catch (err) {
        console.error('[Cron] Alert check failed:', err);
      }
    })
  );

  console.log(`[Cron] ${scheduledTasks.length} scheduled jobs started`);
}

export function stopCronJobs(): void {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.length = 0;
  console.log('[Cron] All scheduled jobs stopped');
}
