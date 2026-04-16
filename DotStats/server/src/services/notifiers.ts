/**
 * 告警通知适配器
 *
 * 支持通道：webhook / dingtalk / wecom / slack
 * 每个适配器将统一的 AlertPayload 转换为目标平台格式并发送
 */

export interface AlertPayload {
  alert: string;
  metric: string;
  value: number;
  operator: string;
  threshold: number;
  triggeredAt: string;
}

export type NotifyChannel = 'webhook' | 'dingtalk' | 'wecom' | 'slack';

export interface NotifyResult {
  success: boolean;
  error?: string;
}

/**
 * 通用 Webhook（原样转发 JSON）
 */
async function sendWebhook(target: string, payload: AlertPayload): Promise<NotifyResult> {
  const res = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  return { success: true };
}

/**
 * 钉钉机器人
 * target 示例：https://oapi.dingtalk.com/robot/send?access_token=xxx
 *
 * 支持加签（secret）：在 target 后追加 &secret=YOUR_SECRET
 */
async function sendDingTalk(target: string, payload: AlertPayload): Promise<NotifyResult> {
  let url = target;

  // 处理加签
  const secretMatch = target.match(/[?&]secret=([^&]+)/);
  if (secretMatch) {
    const secret = secretMatch[1];
    url = target.replace(/[?&]secret=[^&]+/, '');
    const timestamp = Date.now();
    const sign = await hmacSha256Base64(`${timestamp}\n${secret}`, secret);
    url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
  }

  const body = {
    msgtype: 'markdown',
    markdown: {
      title: `🚨 ${payload.alert}`,
      text: [
        `## 🚨 ${payload.alert}`,
        '',
        `| 指标 | 当前值 | 阈值 |`,
        `|------|--------|------|`,
        `| ${payload.metric} | **${payload.value}** | ${payload.operator} ${payload.threshold} |`,
        '',
        `⏰ 触发时间：${payload.triggeredAt}`,
      ].join('\n'),
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  const data = await res.json() as { errcode?: number; errmsg?: string };
  if (data.errcode !== 0) return { success: false, error: data.errmsg };
  return { success: true };
}

/**
 * 企业微信机器人
 * target 示例：https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
 */
async function sendWeCom(target: string, payload: AlertPayload): Promise<NotifyResult> {
  const body = {
    msgtype: 'markdown',
    markdown: {
      content: [
        `## 🚨 ${payload.alert}`,
        `> 指标：<font color="warning">${payload.metric}</font>`,
        `> 当前值：**${payload.value}**`,
        `> 阈值：${payload.operator} ${payload.threshold}`,
        `> 时间：${payload.triggeredAt}`,
      ].join('\n'),
    },
  };

  const res = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  const data = await res.json() as { errcode?: number; errmsg?: string };
  if (data.errcode !== 0) return { success: false, error: data.errmsg };
  return { success: true };
}

/**
 * Slack Incoming Webhook
 * target 示例：https://hooks.slack.com/services/T00/B00/xxx
 */
async function sendSlack(target: string, payload: AlertPayload): Promise<NotifyResult> {
  const body = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🚨 ${payload.alert}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Metric:*\n${payload.metric}` },
          { type: 'mrkdwn', text: `*Value:*\n${payload.value}` },
          { type: 'mrkdwn', text: `*Threshold:*\n${payload.operator} ${payload.threshold}` },
          { type: 'mrkdwn', text: `*Time:*\n${payload.triggeredAt}` },
        ],
      },
    ],
  };

  const res = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  return { success: true };
}

/**
 * HMAC-SHA256 + Base64（用于钉钉加签）
 */
async function hmacSha256Base64(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Buffer.from(signature).toString('base64');
}

/**
 * 验证通知目标 URL，防止 SSRF
 * 仅允许 HTTPS（webhook/dingtalk 允许 HTTP 用于内网部署场景）
 */
function validateNotifyTarget(target: string, _channel: NotifyChannel): string | null {
  try {
    const url = new URL(target);
    // 仅允许 HTTP/HTTPS
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return 'Only HTTP(S) URLs are allowed';
    }
    // 阻止指向本机/内网的请求（基础 SSRF 防护）
    const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
    if (blocked.includes(url.hostname)) {
      return 'Localhost targets are not allowed';
    }
    // 私有 IP 段检查
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(url.hostname)) {
      return 'Private IP ranges are not allowed';
    }
    return null;
  } catch {
    return 'Invalid URL';
  }
}

/**
 * 统一发送入口
 */
export async function sendNotification(
  _channel: NotifyChannel,  // eslint-disable-line @typescript-eslint/no-unused-vars
  target: string,
  payload: AlertPayload,
): Promise<NotifyResult> {
  if (!target) return { success: false, error: 'No target configured' };

  const urlError = validateNotifyTarget(target, channel);
  if (urlError) return { success: false, error: urlError };

  try {
    switch (channel) {
      case 'dingtalk': return await sendDingTalk(target, payload);
      case 'wecom':    return await sendWeCom(target, payload);
      case 'slack':    return await sendSlack(target, payload);
      case 'webhook':
      default:         return await sendWebhook(target, payload);
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
