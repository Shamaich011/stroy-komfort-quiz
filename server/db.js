import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { SETTINGS, WORK_RATES, CATALOG } from './seed.js';

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY, value REAL NOT NULL, label TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS work_rates (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL, price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS catalog (
      id TEXT PRIMARY KEY, category TEXT NOT NULL, kind TEXT, name TEXT NOT NULL,
      unit TEXT NOT NULL, price REAL NOT NULL, coverage REAL, color TEXT, url TEXT,
      verified INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL,
      source TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', comment TEXT NOT NULL DEFAULT '',
      area REAL, client_total INTEGER, net_profit INTEGER, data TEXT NOT NULL
    );
  `);
  seed(db);
  return db;
}

// Добавляет недостающие записи, не трогая отредактированные в админке.
function seed(db) {
  const now = new Date().toISOString();
  const s = db.prepare('INSERT OR IGNORE INTO settings (key, value, label) VALUES (?, ?, ?)');
  for (const x of SETTINGS) s.run(x.key, x.value, x.label);
  const r = db.prepare('INSERT OR IGNORE INTO work_rates (id, name, unit, price) VALUES (?, ?, ?, ?)');
  for (const x of WORK_RATES) r.run(x.id, x.name, x.unit, x.price);
  const c = db.prepare(`INSERT OR IGNORE INTO catalog
    (id, category, kind, name, unit, price, coverage, color, url, verified, enabled, sort, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`);
  CATALOG.forEach((x, i) => c.run(x.id, x.category, x.kind ?? null, x.name, x.unit, x.price,
    x.coverage ?? null, x.color ?? null, x.url ?? null, x.verified ? 1 : 0, i, now));
}

export function loadRefs(db) {
  const settings = {};
  for (const row of db.prepare('SELECT key, value FROM settings').all()) settings[row.key] = row.value;
  const rates = new Map(db.prepare('SELECT * FROM work_rates').all().map((r) => [r.id, { ...r }]));
  const catalog = new Map(db.prepare('SELECT * FROM catalog').all().map((r) => [r.id, { ...r, enabled: !!r.enabled }]));
  return { settings, rates, catalog };
}
