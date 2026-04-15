import type { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import {
  getOnlineCount, getDAU, getWAU, getFeatureCounts,
  getVersionDistribution, getOSDistribution, getEventStream,
} from './redis';

const clients = new Set<any>();

export async function setupWebSocket(app: FastifyInstance): Promise<void> {
  await app.register(websocket);

  const wsToken = process.env.WS_TOKEN; // 可选：设置后要求连接时携带 token

  app.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, request) => {
      // Token 校验（如果配置了 WS_TOKEN）
      if (wsToken) {
        const url = new URL(request.url, 'http://localhost');
        const clientToken = url.searchParams.get('token');
        if (clientToken !== wsToken) {
          connection.socket.close(4001, 'Unauthorized');
          return;
        }
      }

      clients.add(connection.socket);

      connection.socket.on('close', () => {
        clients.delete(connection.socket);
      });

      connection.socket.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'ping') {
            connection.socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch {
          // ignore
        }
      });
    });
  });

  // 广播实时数据（默认 30 秒，可通过 WS_BROADCAST_MS 环境变量配置）
  const broadcastMs = parseInt(process.env.WS_BROADCAST_MS || '30000', 10);
  setInterval(async () => {
    if (clients.size === 0) return;

    try {
      const payload = {
        type: 'realtime',
        timestamp: Date.now(),
        data: {
          onlineNow: await getOnlineCount(),
          todayActive: await getDAU(),
          weekActive: await getWAU(),
          topFeatures: await getFeatureCounts(),
          versionDistribution: await getVersionDistribution(),
          osDistribution: await getOSDistribution(),
          recentEvents: await getEventStream(10),
        },
      };

      const msg = JSON.stringify(payload);
      for (const client of clients) {
        try {
          client.send(msg);
        } catch {
          clients.delete(client);
        }
      }
    } catch (err) {
      console.error('WebSocket broadcast error:', err);
    }
  }, 10_000);
}

// 事件到达时即时广播
export async function broadcastEvent(event: Record<string, unknown>): Promise<void> {
  if (clients.size === 0) return;

  const msg = JSON.stringify({
    type: 'event',
    timestamp: Date.now(),
    data: event,
  });

  for (const client of clients) {
    try {
      client.send(msg);
    } catch {
      clients.delete(client);
    }
  }
}, 10_000);/}, broadcastMs);}
