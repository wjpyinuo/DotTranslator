import websocket from '@fastify/websocket';
import { getOnlineCount, getDAU, getWAU, getFeatureCounts, getVersionDistribution, getOSDistribution, getEventStream, } from './redis';
const clients = new Set();
export async function setupWebSocket(app) {
    await app.register(websocket);
    app.register(async function (fastify) {
        fastify.get('/ws', { websocket: true }, (connection) => {
            clients.add(connection.socket);
            connection.socket.on('close', () => {
                clients.delete(connection.socket);
            });
            connection.socket.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    if (data.type === 'ping') {
                        connection.socket.send(JSON.stringify({ type: 'pong' }));
                    }
                }
                catch {
                    // ignore
                }
            });
        });
    });
    // 每 10 秒广播实时数据
    setInterval(async () => {
        if (clients.size === 0)
            return;
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
                }
                catch {
                    clients.delete(client);
                }
            }
        }
        catch (err) {
            console.error('WebSocket broadcast error:', err);
        }
    }, 10_000);
}
// 事件到达时即时广播
export async function broadcastEvent(event) {
    if (clients.size === 0)
        return;
    const msg = JSON.stringify({
        type: 'event',
        timestamp: Date.now(),
        data: event,
    });
    for (const client of clients) {
        try {
            client.send(msg);
        }
        catch {
            clients.delete(client);
        }
    }
}
