import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { DB_FILE } from '@shared/constants';
import type { FeatureName, HistoryEntry, TMEntry, LocalStatsRecord } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

// SQLite row types
interface HistoryRow {
  id: string;
  source_text: string;
  target_text: string;
  source_lang: string;
  target_lang: string;
  provider: string;
  is_favorite: number;
  created_at: number;
}

interface TMRow {
  id: string;
  source_lang: string;
  target_lang: string;
  source_text: string;
  target_text: string;
  usage_count: number;
  created_at: number;
}

interface LocalStatsRow {
  id: string;
  feature: FeatureName;
  provider: string | null;
  source_lang: string | null;
  target_lang: string | null;
  char_count: number | null;
  latency_ms: number | null;
  tm_hit: number;
  created_at: number;
}

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), DB_FILE);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    -- 翻译历史
    CREATE TABLE IF NOT EXISTS history (
      id            TEXT PRIMARY KEY,
      source_text   TEXT NOT NULL,
      target_text   TEXT NOT NULL,
      source_lang   TEXT NOT NULL,
      target_lang   TEXT NOT NULL,
      provider      TEXT NOT NULL,
      is_favorite   INTEGER DEFAULT 0,
      created_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at);

    -- TM 精确匹配
    CREATE TABLE IF NOT EXISTS tm_entries (
      id            TEXT PRIMARY KEY,
      source_lang   TEXT NOT NULL,
      target_lang   TEXT NOT NULL,
      source_text   TEXT NOT NULL,
      target_text   TEXT NOT NULL,
      usage_count   INTEGER DEFAULT 0,
      created_at    INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_exact
      ON tm_entries(source_lang, target_lang, source_text);

    -- 用户设置
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- 本地个人统计
    CREATE TABLE IF NOT EXISTS local_stats (
      id            TEXT PRIMARY KEY,
      feature       TEXT NOT NULL,
      provider      TEXT,
      source_lang   TEXT,
      target_lang   TEXT,
      char_count    INTEGER,
      latency_ms    INTEGER,
      tm_hit        INTEGER DEFAULT 0,
      created_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_local_stats_feature
      ON local_stats(feature, created_at);

    -- 引擎性能统计
    CREATE TABLE IF NOT EXISTS provider_metrics (
      provider    TEXT NOT NULL,
      date        TEXT NOT NULL,
      total_calls INTEGER DEFAULT 0,
      success     INTEGER DEFAULT 0,
      fail        INTEGER DEFAULT 0,
      avg_latency REAL DEFAULT 0,
      PRIMARY KEY (provider, date)
    );
  `);
}

// ==================== History ====================

export function addHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): HistoryEntry {
  const database = getDatabase();
  const id = uuidv4();
  const createdAt = Date.now();

  database.prepare(`
    INSERT INTO history (id, source_text, target_text, source_lang, target_lang, provider, is_favorite, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, entry.sourceText, entry.targetText, entry.sourceLang, entry.targetLang,
    entry.provider, entry.isFavorite ? 1 : 0, createdAt);

  return { id, ...entry, createdAt };
}

export function getHistory(limit = 100): HistoryEntry[] {
  const database = getDatabase();
  const rows = database.prepare(
    'SELECT * FROM history ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as HistoryRow[];
  return rows.map(mapHistoryRow);
}

export function searchHistory(query: string): HistoryEntry[] {
  const database = getDatabase();
  const rows = database.prepare(
    'SELECT * FROM history WHERE source_text LIKE ? OR target_text LIKE ? ORDER BY created_at DESC LIMIT 50'
  ).all(`%${query}%`, `%${query}%`) as HistoryRow[];
  return rows.map(mapHistoryRow);
}

function mapHistoryRow(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    sourceText: row.source_text,
    targetText: row.target_text,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
    provider: row.provider,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
  };
}

export function toggleFavorite(id: string, favorite: boolean): void {
  const database = getDatabase();
  database.prepare('UPDATE history SET is_favorite = ? WHERE id = ?').run(favorite ? 1 : 0, id);
}

// ==================== TM ====================

export function tmLookup(sourceLang: string, targetLang: string, sourceText: string): TMEntry | null {
  const database = getDatabase();
  const row = database.prepare(
    'SELECT * FROM tm_entries WHERE source_lang = ? AND target_lang = ? AND source_text = ?'
  ).get(sourceLang, targetLang, sourceText) as TMRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
    sourceText: row.source_text,
    targetText: row.target_text,
    usageCount: row.usage_count,
    createdAt: row.created_at,
  };
}

export function tmInsert(entry: Omit<TMEntry, 'id' | 'createdAt'>): void {
  const database = getDatabase();
  const id = uuidv4();
  database.prepare(`
    INSERT OR REPLACE INTO tm_entries (id, source_lang, target_lang, source_text, target_text, usage_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, entry.sourceLang, entry.targetLang, entry.sourceText, entry.targetText,
    entry.usageCount, Date.now());
}

// ==================== Settings ====================

export function getSetting(key: string): string | null {
  const database = getDatabase();
  const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const database = getDatabase();
  database.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// ==================== Local Stats ====================

export function recordLocalStat(record: Omit<LocalStatsRecord, 'id' | 'createdAt'>): void {
  const database = getDatabase();
  database.prepare(`
    INSERT INTO local_stats (id, feature, provider, source_lang, target_lang, char_count, latency_ms, tm_hit, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), record.feature, record.provider, record.sourceLang, record.targetLang,
    record.charCount, record.latencyMs, record.tmHit ? 1 : 0, Date.now());
}

export function getLocalStats(days = 30): LocalStatsRecord[] {
  const database = getDatabase();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = database.prepare(
    'SELECT * FROM local_stats WHERE created_at > ? ORDER BY created_at DESC'
  ).all(since) as LocalStatsRow[];
  return rows.map((row) => ({
    id: row.id,
    feature: row.feature,
    provider: row.provider ?? undefined,
    sourceLang: row.source_lang ?? undefined,
    targetLang: row.target_lang ?? undefined,
    charCount: row.char_count ?? undefined,
    latencyMs: row.latency_ms ?? undefined,
    tmHit: row.tm_hit === 1,
    createdAt: row.created_at,
  }));
}

// ==================== Provider Metrics ====================

export function recordProviderMetric(provider: string, success: boolean, latencyMs: number): void {
  const database = getDatabase();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  database.prepare(`
    INSERT INTO provider_metrics (provider, date, total_calls, success, fail, avg_latency)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(provider, date) DO UPDATE SET
      total_calls = total_calls + 1,
      success = success + ?,
      fail = fail + ?,
      avg_latency = (avg_latency * (total_calls - 1) + ?) / total_calls
  `).run(provider, today, success ? 1 : 0, success ? 0 : 1, latencyMs,
    success ? 1 : 0, success ? 0 : 1, latencyMs);
}

export function getProviderMetrics(days = 30): { provider: string; date: string; totalCalls: number; success: number; fail: number; avgLatency: number }[] {
  const database = getDatabase();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = database.prepare(
    'SELECT * FROM provider_metrics WHERE date >= ? ORDER BY date DESC'
  ).all(since) as { provider: string; date: string; total_calls: number; success: number; fail: number; avg_latency: number }[];
  return rows.map((row) => ({
    provider: row.provider,
    date: row.date,
    totalCalls: row.total_calls,
    success: row.success,
    fail: row.fail,
    avgLatency: row.avg_latency,
  }));
}
