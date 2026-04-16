/**
 * SQLite 轻量模式 - 替代 PostgreSQL
 * 兼容 pg.Pool 的 query 接口，底层使用 better-sqlite3
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export async function initDatabase(): Promise<void> {
  if (db) return;

  const dbDir = process.env.LITE_DB_DIR || path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, 'dotstats-lite.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema();
}

function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// 模拟 pg.Pool 接口
export function getPool() {
  return {
    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
      const database = getDb();
      const normalized = normalizeSQL(sql, params);

      if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('WITH')) {
        try {
          const rows = database.prepare(normalized.sql).all(...normalized.params) as T[];
          return { rows, rowCount: rows.length };
        } catch {
          return { rows: [], rowCount: 0 };
        }
      }

      try {
        const result = database.prepare(normalized.sql).run(...normalized.params);
        return { rows: [], rowCount: result.changes };
      } catch {
        return { rows: [], rowCount: 0 };
      }
    },

    async connect() {
      return {
        query: async <T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> => {
          return getPool().query<T>(sql, params);
        },
        release: () => {},
      };
    },

    async end() {
      if (db) { db.close(); db = null; }
    },
  };
}

/**
 * 将 PostgreSQL 的 $1, $2 占位符转为 SQLite 的 ?, ?
 * 同时转换一些 PG 特有语法
 */
function normalizeSQL(sql: string, params?: unknown[]): { sql: string; params: unknown[] } {
  let normalized = sql;
  const normalizedParams = params ? [...params] : [];

  // $1 → ?
  normalized = normalized.replace(/\$(\d+)/g, (_, n) => '?');

  // INTERVAL $1::int || ' days' → 简化处理
  normalized = normalized.replace(/INTERVAL\s+\?\s*\|\|\s*' days'/i, '? || " days"');

  // TIMESTAMPTZ → TEXT
  normalized = normalized.replace(/TIMESTAMPTZ/gi, 'TEXT');

  // BIGSERIAL → INTEGER PRIMARY KEY AUTOINCREMENT
  normalized = normalized.replace(/BIGSERIAL/gi, 'INTEGER');

  // BOOLEAN → INTEGER
  normalized = normalized.replace(/BOOLEAN/gi, 'INTEGER');

  // JSONB → TEXT
  normalized = normalized.replace(/JSONB/gi, 'TEXT');

  // REAL → REAL (fine as is)

  // CURRENT_DATE → date('now')
  normalized = normalized.replace(/CURRENT_DATE/gi, "date('now')");

  // NOW() → datetime('now')
  normalized = normalized.replace(/\bNOW\(\)/gi, "datetime('now')");

  // DATE_TRUNC workaround - use date() for day granularity
  normalized = normalized.replace(
    /DATE_TRUNC\('week',\s*(\w+)\)/gi,
    "date($1, 'weekday 0', '-6 days')"
  );
  normalized = normalized.replace(
    /DATE_TRUNC\('month',\s*(\w+)\)/gi,
    "date($1, 'start of month')"
  );

  // UNNEST → we can't do this in SQLite, fallback to individual inserts (handled elsewhere)
  // For now just pass through - the caller handles batch inserts differently

  // COUNT(DISTINCT x) works in SQLite
  // GROUP BY, ORDER BY, LIMIT all work

  // EXCLUDED.column → the excluded values (SQLite uses excluded too in ON CONFLICT)
  normalized = normalized.replace(/EXCLUDED\./gi, 'excluded.');

  // Process interval params: if we had a param like "30" for days, convert to "30 days"
  for (let i = 0; i < normalizedParams.length; i++) {
    if (typeof normalizedParams[i] === 'number' && sql.includes('INTERVAL')) {
      normalizedParams[i] = `${normalizedParams[i]} days`;
    }
  }

  return { sql: normalized, params: normalizedParams };
}

function initSchema(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS instances (
      instance_id     TEXT PRIMARY KEY,
      first_seen      TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen       TEXT NOT NULL DEFAULT (datetime('now')),
      version         TEXT NOT NULL,
      os              TEXT NOT NULL,
      os_version      TEXT,
      arch            TEXT,
      locale          TEXT,
      total_sessions  INTEGER DEFAULT 0,
      total_events    INTEGER DEFAULT 0,
      is_active       INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_instances_last_seen ON instances(last_seen);
    CREATE INDEX IF NOT EXISTS idx_instances_version ON instances(version);
    CREATE INDEX IF NOT EXISTS idx_instances_os ON instances(os);
    CREATE INDEX IF NOT EXISTS idx_instances_active ON instances(is_active, last_seen);

    CREATE TABLE IF NOT EXISTS events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      instance_id   TEXT NOT NULL REFERENCES instances(instance_id) ON DELETE CASCADE,
      event_type    TEXT NOT NULL,
      feature       TEXT,
      metadata      TEXT DEFAULT '{}',
      received_at   TEXT NOT NULL DEFAULT (datetime('now')),
      client_ts     INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_received ON events(received_at);
    CREATE INDEX IF NOT EXISTS idx_events_feature ON events(feature, received_at);

    CREATE TABLE IF NOT EXISTS events_archive (
      id            INTEGER,
      instance_id   TEXT NOT NULL,
      event_type    TEXT NOT NULL,
      feature       TEXT,
      metadata      TEXT DEFAULT '{}',
      received_at   TEXT NOT NULL,
      client_ts     INTEGER NOT NULL,
      archived_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_archive_received ON events_archive(received_at);

    CREATE TABLE IF NOT EXISTS daily_metrics (
      date                   TEXT NOT NULL PRIMARY KEY,
      dau                    INTEGER NOT NULL,
      new_instances          INTEGER NOT NULL,
      heartbeats             INTEGER NOT NULL,
      feature_calls          INTEGER NOT NULL,
      version_distribution   TEXT NOT NULL DEFAULT '{}',
      os_distribution        TEXT NOT NULL DEFAULT '{}',
      locale_distribution    TEXT NOT NULL DEFAULT '{}',
      feature_breakdown      TEXT NOT NULL DEFAULT '{}',
      created_at             TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS retention_weekly (
      cohort_week       TEXT NOT NULL PRIMARY KEY,
      cohort_size       INTEGER NOT NULL,
      w1_retained       INTEGER NOT NULL,
      w2_retained       INTEGER NOT NULL,
      w4_retained       INTEGER NOT NULL,
      w8_retained       INTEGER NOT NULL,
      w12_retained      INTEGER NOT NULL,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
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
      is_enabled      INTEGER DEFAULT 1,
      last_triggered  TEXT,
      cooldown_minutes INTEGER DEFAULT 60
    );

    CREATE TABLE IF NOT EXISTS provider_metrics (
      provider      TEXT NOT NULL,
      date          TEXT NOT NULL DEFAULT (date('now')),
      total_calls   INTEGER DEFAULT 0,
      success       INTEGER DEFAULT 0,
      fail          INTEGER DEFAULT 0,
      total_latency REAL DEFAULT 0,
      PRIMARY KEY (provider, date)
    );
  `);
}
