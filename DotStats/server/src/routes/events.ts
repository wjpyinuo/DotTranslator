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
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Instance upsert
      const firstEvent = events[0]?.payload;
      await client.query(`
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
      if (events.length > 0) {
        if (process.env.LITE_MODE === '1') {
          // 轻量模式：逐条插入（SQLite 不支持 UNNEST）
          for (const event of events) {
            await client.query(
              'INSERT INTO events (instance_id, event_type, feature, metadata, client_ts) VALUES (?, ?, ?, ?, ?)',
              [instanceId, event.type, event.payload.feature || null,
                JSON.stringify(event.payload.metadata || {}), event.timestamp]
            );
          }
        } else {
          // 生产模式：使用 UNNEST 优化大批量插入
          const ids: string[] = [];
          const types: string[] = [];
          const features: (string | null)[] = [];
          const metadatas: string[] = [];
          const timestamps: number[] = [];

          for (const event of events) {
            ids.push(instanceId);
            types.push(event.type);
            features.push(event.payload.feature || null);
            metadatas.push(JSON.stringify(event.payload.metadata || {}));
            timestamps.push(event.timestamp);
          }

          await client.query(`
            INSERT INTO events (instance_id, event_type, feature, metadata, client_ts)
            SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::jsonb[], $5::bigint[])
          `, [ids, types, features, metadatas, timestamps]);
        }
      }

      // 聚合 provider_metrics（按 provider 分组，一次性更新）
      const providerAgg: Record<string, { calls: number; totalLatency: number }> = {};
      for (const event of events) {
        if (event.type === 'feature' && event.payload.metadata?.provider) {
          const p = event.payload.metadata.provider as string;
          if (!providerAgg[p]) providerAgg[p] = { calls: 0, totalLatency: 0 };
          providerAgg[p].calls++;
          providerAgg[p].totalLatency += (event.payload.metadata.latencyMs as number) || 0;
        }
      }
      for (const [provider, agg] of Object.entries(providerAgg)) {
        const avgLatency = agg.totalLatency / agg.calls;
        await client.query(`
          INSERT INTO provider_metrics (provider, date, total_calls, success, fail, avg_latency)
          VALUES ($1, CURRENT_DATE, $2, $2, 0, $3)
          ON CONFLICT (provider, date) DO UPDATE SET
            total_calls = provider_metrics.total_calls + $2,
            success = provider_metrics.success + $2,
            avg_latency = (provider_metrics.avg_latency * provider_metrics.total_calls + $3 * $2) / (provider_metrics.total_calls + $2)
        `, [provider, agg.calls, avgLatency]);
      }

      await client.query('COMMIT');

      // Redis 实时更新
      await setOnline(instanceId);
      await addToDAU(instanceId);
      await addToWAU(instanceId);

      for (const event of events) {
        if (event.type === 'feature' && event.payload.feature) {
          await incrementFeature(event.payload.feature);
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

      // WebSocket 批量广播（合并为单次推送）
      const broadcastPayload = events.map((e) => ({
        instanceId,
        type: e.type,
        feature: e.payload.feature,
      }));
      for (const item of broadcastPayload) {
        await broadcastEvent(item);
      }

      return reply.status(204).send();
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      app.log.error(err);
      return reply.status(500).send({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });
}
