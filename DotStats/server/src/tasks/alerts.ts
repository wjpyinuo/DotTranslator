import { getPool } from '../db/pool';
import { getOnlineCount, getDAU } from '../services/redis';

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  window_hours: number;
  notify_channel: string;
  notify_target: string;
  is_enabled: boolean;
}

export async function checkAlerts(): Promise<void> {
  const pool = getPool();

  const { rows: rules } = await pool.query<AlertRule>(
    'SELECT * FROM alert_rules WHERE is_enabled = TRUE'
  );

  for (const rule of rules) {
    try {
      const value = await getMetricValue(rule.metric);
      if (value === null) continue;

      const triggered = evaluateCondition(value, rule.operator, rule.threshold);

      if (triggered) {
        await pool.query(
          'UPDATE alert_rules SET last_triggered = NOW() WHERE id = $1',
          [rule.id]
        );

        console.log(`[Alert] 🚨 "${rule.name}" triggered: ${rule.metric}=${value} ${rule.operator} ${rule.threshold}`);

        // TODO: 发送通知 (webhook / email / etc.)
        // if (rule.notify_channel === 'webhook' && rule.notify_target) {
        //   await fetch(rule.notify_target, { method: 'POST', body: JSON.stringify({ rule, value }) });
        // }
      }
    } catch (err) {
      console.error(`[Alert] Check failed for rule "${rule.name}":`, err);
    }
  }
}

async function getMetricValue(metric: string): Promise<number | null> {
  switch (metric) {
    case 'online_now':
      return getOnlineCount();

    case 'dau':
      return getDAU();

    case 'dau_drop_pct': {
      const pool = getPool();
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      const { rows } = await pool.query(
        'SELECT dau FROM daily_metrics WHERE date IN ($1, $2) ORDER BY date DESC',
        [today, yesterday]
      );

      if (rows.length < 2) return null;
      const drop = ((rows[1].dau - rows[0].dau) / rows[1].dau) * 100;
      return drop;
    }

    case 'error_rate': {
      const pool = getPool();
      const since = new Date(Date.now() - 3600000).toISOString();
      const { rows } = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'error')::float /
          NULLIF(COUNT(*), 0) * 100 as rate
        FROM events WHERE received_at >= $1
      `, [since]);
      return rows[0]?.rate ?? null;
    }

    default:
      console.warn(`[Alert] Unknown metric: ${metric}`);
      return null;
  }
}

function evaluateCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>':  return value > threshold;
    case '<':  return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    default:   return false;
  }
}
