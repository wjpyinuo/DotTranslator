import { getPool } from '../db/pool';
import { getOnlineCount, getDAU } from '../services/redis';
import { sendNotification, type NotifyChannel, type AlertPayload } from '../services/notifiers';

/** 验证 webhook URL 为合法 HTTPS 地址（防止 SSRF） */
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname !== 'localhost' && !parsed.hostname.startsWith('127.');
  } catch {
    return false;
  }
}

// 默认告警冷却时间（分钟），防止重复告警刷屏
const DEFAULT_COOLDOWN_MINUTES = parseInt(process.env.ALERT_COOLDOWN_MINUTES || '60', 10);

// 防重入锁：防止上次检查未完成时触发新检查
let checking = false;

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
  last_triggered: string | null;
  cooldown_minutes: number | null;
}

export async function checkAlerts(): Promise<void> {
  if (checking) {
    console.log('[Alert] Previous check still running, skipping');
    return;
  }
  checking = true;

  try {
    await doCheckAlerts();
  } finally {
    checking = false;
  }
}

async function doCheckAlerts(): Promise<void> {
  const pool = getPool();

  const { rows: rules } = await pool.query(
    'SELECT * FROM alert_rules WHERE is_enabled = TRUE'
  ) as { rows: AlertRule[] };

  const now = Date.now();

  for (const rule of rules) {
    try {
      // 冷却检查：如果上次触发时间在冷却窗口内，跳过
      if (rule.last_triggered) {
        const cooldownMs = (rule.cooldown_minutes ?? DEFAULT_COOLDOWN_MINUTES) * 60 * 1000;
        const lastTriggeredMs = new Date(rule.last_triggered).getTime();
        if (now - lastTriggeredMs < cooldownMs) {
          continue;
        }
      }

      const value = await getMetricValue(rule.metric);
      if (value === null) continue;

      const triggered = evaluateCondition(value, rule.operator, rule.threshold);

      if (triggered) {
        await pool.query(
          'UPDATE alert_rules SET last_triggered = NOW() WHERE id = $1',
          [rule.id]
        );

        console.log(`[Alert] 🚨 "${rule.name}" triggered: ${rule.metric}=${value} ${rule.operator} ${rule.threshold}`);

        // 发送通知
        const payload: AlertPayload = {
          alert: rule.name,
          metric: rule.metric,
          value,
          operator: rule.operator,
          threshold: rule.threshold,
          triggeredAt: new Date().toISOString(),
        };

        const channel = (rule.notify_channel || 'webhook') as NotifyChannel;
        // 运行时 URL 安全校验（防御性检查，防止数据库中存在非法 URL）
        if (rule.notify_target && !isValidWebhookUrl(rule.notify_target)) {
          console.error(`[Alert] Invalid webhook URL for rule "${rule.name}": ${rule.notify_target}`);
          continue;
        }
        const result = await sendNotification(channel, rule.notify_target, payload);
        if (!result.success) {
          console.error(`[Alert] Notify failed for "${rule.name}" (${channel}): ${result.error}`);
        }
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

      if (rows.length < 2 || rows[1].dau === 0) return null;
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
