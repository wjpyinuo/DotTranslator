import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export async function initDatabase(): Promise<pg.Pool> {
  if (process.env.LITE_MODE === '1') {
    const lite = await import('./lite-pool');
    await lite.initDatabase();
    return lite.getPool() as unknown as pg.Pool;
  }

  if (pool) return pool;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://dotstats:dotstats@localhost:5432/dotstats',
    max: 20,
    idleTimeoutMillis: 30000,
  });

  // 测试连接
  const client = await pool.connect();
  client.release();

  // 自动建表
  await initSchema();
  return pool;
}

export function getPool() {
  if (process.env.LITE_MODE === '1') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lite = require('./lite-pool');
    return lite.getPool();
  }
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

async function initSchema(): Promise<void> {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS instances (
      instance_id     TEXT PRIMARY KEY,
      first_seen      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      version         TEXT NOT NULL,
      os              TEXT NOT NULL,
      os_version      TEXT,
      arch            TEXT,
      locale          TEXT,
      total_sessions  INTEGER DEFAULT 0,
      total_events    INTEGER DEFAULT 0,
      is_active       BOOLEAN DEFAULT TRUE
    );
    CREATE INDEX IF NOT EXISTS idx_instances_last_seen ON instances(last_seen);
    CREATE INDEX IF NOT EXISTS idx_instances_version ON instances(version);
    CREATE INDEX IF NOT EXISTS idx_instances_os ON instances(os);
    CREATE INDEX IF NOT EXISTS idx_instances_active ON instances(is_active, last_seen);

    CREATE TABLE IF NOT EXISTS events (
      id            BIGSERIAL PRIMARY KEY,
      instance_id   TEXT NOT NULL REFERENCES instances(instance_id) ON DELETE CASCADE,
      event_type    TEXT NOT NULL,
      feature       TEXT,
      metadata      JSONB DEFAULT '{}',
      received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      client_ts     BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_received ON events(received_at);
    CREATE INDEX IF NOT EXISTS idx_events_feature ON events(feature, received_at);

    CREATE TABLE IF NOT EXISTS events_archive (
      id            BIGSERIAL,
      instance_id   TEXT NOT NULL,
      event_type    TEXT NOT NULL,
      feature       TEXT,
      metadata      JSONB DEFAULT '{}',
      received_at   TIMESTAMPTZ NOT NULL,
      client_ts     BIGINT NOT NULL,
      archived_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_events_archive_received ON events_archive(received_at);

    CREATE TABLE IF NOT EXISTS daily_metrics (
      date                   DATE NOT NULL PRIMARY KEY,
      dau                    INTEGER NOT NULL,
      new_instances          INTEGER NOT NULL,
      heartbeats             INTEGER NOT NULL,
      feature_calls          INTEGER NOT NULL,
      version_distribution   JSONB NOT NULL DEFAULT '{}',
      os_distribution        JSONB NOT NULL DEFAULT '{}',
      locale_distribution    JSONB NOT NULL DEFAULT '{}',
      feature_breakdown      JSONB NOT NULL DEFAULT '{}',
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_metrics(date DESC);

    CREATE TABLE IF NOT EXISTS retention_weekly (
      cohort_week       TEXT NOT NULL PRIMARY KEY,
      cohort_size       INTEGER NOT NULL,
      w1_retained       INTEGER NOT NULL,
      w2_retained       INTEGER NOT NULL,
      w4_retained       INTEGER NOT NULL,
      w8_retained       INTEGER NOT NULL,
      w12_retained      INTEGER NOT NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      metric          TEXT NOT NULL,
      operator        TEXT NOT NULL,
      threshold       REAL NOT NULL,
      window_hours    INTEGER DEFAULT 24,
      notify_channel  TEXT DEFAULT 'webhook',
      notify_target   TEXT,
      is_enabled      BOOLEAN DEFAULT TRUE,
      last_triggered  TIMESTAMPTZ,
      cooldown_minutes INTEGER DEFAULT 60
    );

    CREATE TABLE IF NOT EXISTS provider_metrics (
      provider      TEXT NOT NULL,
      date          DATE NOT NULL DEFAULT CURRENT_DATE,
      total_calls   INTEGER DEFAULT 0,
      success       INTEGER DEFAULT 0,
      fail          INTEGER DEFAULT 0,
      total_latency REAL DEFAULT 0,
      avg_latency   REAL DEFAULT 0,
      PRIMARY KEY (provider, date)
    );
  `);
}
