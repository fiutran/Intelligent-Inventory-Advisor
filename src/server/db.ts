import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  seedInventoryRows,
  seedKeywordRows,
  seedProductAliasRows,
  seedProductCacheRows,
  SEED_CATEGORY_ROWS,
} from '../db/map.js';
import type { InventoryItemRow } from '../db/types.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = join(process.cwd(), 'data', 'app.db');

export type AppDatabase = Database.Database;

export function openDatabase(path = DEFAULT_PATH): AppDatabase {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  seedIfEmpty(db);
  return db;
}

function migrate(db: AppDatabase): void {
  const sql = readFileSync(join(__dir, 'schema.sqlite.sql'), 'utf8');
  db.exec(sql);
}

function seedIfEmpty(db: AppDatabase): void {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM user').get() as { n: number };
  if (userCount.n > 0) return;

  db.prepare('INSERT INTO user (user_id, name) VALUES (1, ?)').run('Demo user');

  const insCat = db.prepare(
    'INSERT INTO category (category_id, name, icon) VALUES (?, ?, ?)',
  );
  for (const c of SEED_CATEGORY_ROWS) {
    insCat.run(c.category_id, c.name, c.icon);
  }

  const insKw = db.prepare(
    'INSERT INTO keyword (keyword_id, category_id, word, source) VALUES (?, ?, ?, ?)',
  );
  for (const k of seedKeywordRows()) {
    insKw.run(k.keyword_id, k.category_id, k.word, k.source);
  }

  const insProd = db.prepare(`
    INSERT INTO product_cache (product_key, category_id, brand, model, summary, icon, price, specs, source, researched_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of seedProductCacheRows()) {
    insProd.run(
      p.product_key,
      p.category_id,
      p.brand,
      p.model,
      p.summary,
      p.icon,
      p.price,
      JSON.stringify(p.specs),
      p.source,
      p.researched_at,
      p.expires_at,
    );
  }

  const insAlias = db.prepare(
    'INSERT INTO product_alias (alias_id, product_key, alias, source) VALUES (?, ?, ?, ?)',
  );
  for (const a of seedProductAliasRows()) {
    insAlias.run(a.alias_id, a.product_key, a.alias, a.source);
  }

  const insInv = db.prepare(`
    INSERT INTO inventory_item (item_id, user_id, category_id, brand, model, summary, icon, price, release_year, specs, provenance, confidence, status, acquired_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of seedInventoryRows(1)) {
    insertInventoryRow(insInv, row);
  }
}

function insertInventoryRow(
  stmt: Database.Statement,
  row: InventoryItemRow,
): void {
  stmt.run(
    row.item_id,
    row.user_id,
    row.category_id,
    row.brand,
    row.model,
    row.summary,
    row.icon,
    row.price,
    row.release_year,
    JSON.stringify(row.specs),
    row.provenance,
    row.confidence,
    row.status,
    row.acquired_at,
  );
}

export { DEFAULT_PATH };
