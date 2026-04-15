import { v4 as uuidv4 } from 'uuid';
import { recordLocalStat } from '@main/database';
import type { FeatureName, TelemetryEvent } from '@shared/types';
import {
  HEARTBEAT_MS, FLUSH_MS, MAX_QUEUE, MAX_RETRY_QUEUE,
  bucketCharCount, PRIVACY_ALLOWED_KEYS, PRIVACY_BLOCKED_KEYS,
} from '@shared/constants';

interface TranslationDetail {
  provider: string;
  sourceLang: string;
  targetLang: string;
  charCount: number;
  latencyMs: number;
  tmHit: boolean;
}

export class TelemetryReporter {
  private queue: TelemetryEvent[] = [];
  private retryQueue: TelemetryEvent[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionStart: number;
  private instanceId: string;
  private enabled: boolean;

  constructor(instanceId?: string, enabled = true) {
    this.instanceId = instanceId || uuidv4();
    this.enabled = enabled;
    this.sessionStart = Date.now();
  }

  start(): void {
    if (!this.enabled) return;

    this.heartbeatTimer = setInterval(() => {
      this.enqueue(this.buildHeartbeat());
    }, HEARTBEAT_MS);

    this.flushTimer = setInterval(() => {
      this.flush();
    }, FLUSH_MS);
  }

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.queue = [];
      this.retryQueue = [];
    }
  }

  trackFeature(feature: FeatureName, metadata?: Record<string, string | number>): void {
    // 本地统计始终记录
    recordLocalStat({
      feature,
      provider: metadata?.provider as string,
      charCount: metadata?.charCountBucket as number,
      latencyMs: metadata?.latencyMs as number,
      tmHit: false,
    });

    if (!this.enabled) return;

    const sanitized = PrivacyFilter.sanitizeMetadata(metadata);
    this.enqueue(this.buildFeatureEvent(feature, sanitized));
  }

  recordTranslation(detail: TranslationDetail): void {
    recordLocalStat({
      feature: 'translate_manual',
      provider: detail.provider,
      sourceLang: detail.sourceLang,
      targetLang: detail.targetLang,
      charCount: detail.charCount,
      latencyMs: detail.latencyMs,
      tmHit: detail.tmHit,
    });

    if (!this.enabled) return;

    this.trackFeature('translate_manual', {
      provider: detail.provider,
      charCountBucket: bucketCharCount(detail.charCount),
    });
  }

  private enqueue(event: TelemetryEvent): void {
    if (this.queue.length >= MAX_QUEUE) {
      this.retryQueue.push(event);
      if (this.retryQueue.length > MAX_RETRY_QUEUE) {
        this.retryQueue.shift();
      }
      return;
    }
    this.queue.push(event);
  }

  private async flush(): Promise<void> {
    // 先尝试重试队列
    if (this.retryQueue.length > 0) {
      const retryEvents = [...this.retryQueue];
      this.retryQueue = [];
      await this.sendEvents(retryEvents);
    }

    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    await this.sendEvents(events);
  }

  private async sendEvents(events: TelemetryEvent[]): Promise<void> {
    const serverUrl = this.getServerUrl();
    if (!serverUrl) {
      console.log(`[Telemetry] Flushing ${events.length} events (local only, no server configured)`);
      return;
    }

    try {
      const res = await fetch(`${serverUrl}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Instance-Id': this.instanceId,
        },
        body: JSON.stringify({ events }),
      });

      if (!res.ok) {
        console.warn(`[Telemetry] Server responded ${res.status}, re-queuing events`);
        this.retryQueue.push(...events);
      }
    } catch (err) {
      console.warn('[Telemetry] Flush failed, re-queuing events:', err);
      this.retryQueue.push(...events);
    }
  }

  private buildHeartbeat(): TelemetryEvent {
    return {
      type: 'heartbeat',
      timestamp: Date.now(),
      payload: {
        instanceId: this.instanceId,
        version: '0.1.0',
        os: process.platform,
        osVersion: process.version,
        arch: process.arch,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        theme: 'dark',
        activeProviders: [],
        privacyMode: false,
        sessionDurationSec: Math.floor((Date.now() - this.sessionStart) / 1000),
      },
    };
  }

  private buildFeatureEvent(feature: FeatureName, metadata?: Record<string, string | number>): TelemetryEvent {
    return {
      type: 'feature',
      timestamp: Date.now(),
      payload: {
        instanceId: this.instanceId,
        version: '0.1.0',
        feature,
        metadata,
      },
    };
  }
  private getServerUrl(): string | null {
    // Try to read from electron-store or use env var
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Store = require('electron-store');
      const store = new Store();
      return store.get('serverUrl') as string || null;
    } catch {
      return null;
    }
  }
}

class PrivacyFilter {
  static sanitizeMetadata(meta?: Record<string, any>): Record<string, string | number> | undefined {
    if (!meta) return undefined;

    const sanitized: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (PRIVACY_BLOCKED_KEYS.some((blocked) => key.toLowerCase().includes(blocked))) {
        continue;
      }
      if (!PRIVACY_ALLOWED_KEYS.has(key)) continue;
      if (typeof value === 'string' && value.length > 50) continue;
      if (typeof value === 'string' || typeof value === 'number') {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

export const telemetry = new TelemetryReporter();
