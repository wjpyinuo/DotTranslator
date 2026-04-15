import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getPool } from '../db/pool';
import { setOnline, addToDAU, addToWAU, incrementFeature, updateVersion, pushEventStream } from '../services/redis';
import { broadcastEvent } from '../services/websocket';

const eventSchema = z.object({
  events: z.array(z.object({
    type: z.enum(['heartbeat', 'feature']),
    timestamp: z.number(),
    payload: z.object({
      instanceId: z.string(),
      version: z.string(),
      os: z.string().optional(),
      osVersion: z.string().optional(),
      arch: z.string().optional(),
      locale: z.string().optional(),
      theme: z.string().optional(),
      feature: z.string().optional(),
      metadata: z.record(z.union([z.string(), z.number()])).optional(),
    }),
  })).max(50),
});

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/events - 数据接收
  app.post('/events', async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.issues });
    }

    const { events } = parsed.data;
    const instanceId = request.headers['x-instance-id'] as string || events[0]?.payload.instanceId;

    if (!instanceId) {
      return reply.status(400).send({ error: 'Missing instance ID' });
    }

    const pool = getPool();
    const now = new Date();

    try {
      // Instance upsert
      const firstEvent = events[0]?.payload;
      await pool.query(`
        INSERT INTO instances (instance_id, version, os, os_version, arch, locale, first_seen, last_seen)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        ON CONFLICT (instance_id) DO UPDATE SET
          last_seen = $7,
          version = EXCLUDED.version,
          os = EXCLUDED.os,
          os_version = EXCLUDED.os_version,
          arch = EXCLUDED.arch,
          locale = EXCLUDED.locale,
          total_events = instances.total_events + 1
      `, [instanceId, firstEvent?.version || 'unknown', firstEvent?.os || 'unknown',
        firstEvent?.osVersion, firstEvent?.arch, firstEvent?.locale, now]);

      // Batch insert events
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (const event of events) {
        placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        values.push(instanceId, event.type, event.payload.feature || null,
          JSON.stringify(event.payload.metadata || {}), event.timestamp);
      }

      if (placeholders.length > 0) {
        await pool.query(
          `INSERT INTO events (instance_id, event_type, feature, metadata, client_ts) VALUES ${placeholders.join(', ')}`,
          values
        );
      }

      // Redis 实时更新
      await setOnline(instanceId);
      await addToDAU(instanceId);
      await addToWAU(instanceId);

      for (const event of events) {
        if (event.type === 'feature' && event.payload.feature) {
          await incrementFeature(event.payload.feature);

          // 记录 provider 性能指标
          const provider = event.payload.metadata?.provider;
          if (provider) {
            await pool.query(`
              INSERT INTO provider_metrics (provider, date, total_calls, success, fail, avg_latency)
              VALUES ($1, CURRENT_DATE, 1, 1, 0, $2)
              ON CONFLICT (provider, date) DO UPDATE SET
                total_calls = provider_metrics.total_calls + 1,
                success = provider_metrics.success + 1,
                avg_latency = (provider_metrics.avg_latency * provider_metrics.total_calls + $2) / (provider_metrics.total_calls + 1)
            `, [provider, event.payload.metadata?.latencyMs || 0]);
          }
        }
        if (event.payload.version) {
          await updateVersion(instanceId, event.payload.version);
        }
        await pushEventStream({
          instanceId,
          type: event.type,
          feature: event.payload.feature,
          timestamp: event.timestamp,
        });
      }

      // WebSocket 广播
      for (const event of events) {
        await broadcastEvent({
          instanceId,
          type: event.type,
          feature: event.payload.feature,
        });
      }

      return reply.status(204).send();
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
