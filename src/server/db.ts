import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  seedKeywordRows,
  seedProductAliasRows,
  seedProductCacheRows,
  SEED_CATEGORY_ROWS,
} from '../db/map.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = join(process.cwd(), 'data', 'app.db');

/** Built-in Node SQLite: no native addon / rebuild needed */
export type AppDatabase = DatabaseSync;

export function openDatabase(path = DEFAULT_PATH): AppDatabase {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  seedIfEmpty(db);
  ensureCategories(db);
  syncCatalog(db);
  return db;
}

function migrate(db: AppDatabase): void {
  const sql = readFileSync(join(__dir, 'schema.sqlite.sql'), 'utf8');
  db.exec(sql);
}

function seedIfEmpty(db: AppDatabase): void {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM user').get() as
    | { n: number }
    | undefined;
  if (userCount && userCount.n > 0) return;

  db.prepare('INSERT INTO user (user_id, name) VALUES (1, ?)').run('You');

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

  // Catalog products/aliases filled by syncCatalog
}

/** Existing databases only seed categories once. New electronics categories still need to appear. */
function ensureCategories(db: AppDatabase): void {
  const keep = new Set(SEED_CATEGORY_ROWS.map((c) => c.category_id));
  const inUse = db.prepare(
    `SELECT 1 AS n FROM inventory_item WHERE category_id = ?
     UNION ALL SELECT 1 FROM product_cache WHERE category_id = ?
     UNION ALL SELECT 1 FROM decision WHERE category_id = ?`,
  );
  const delKw = db.prepare('DELETE FROM keyword WHERE category_id = ?');
  const delCat = db.prepare('DELETE FROM category WHERE category_id = ?');
  const dropIfFree = (categoryId: number) => {
    if (keep.has(categoryId)) return;
    const used = inUse.get(categoryId, categoryId, categoryId) as { n: number } | undefined;
    if (used) return;
    delKw.run(categoryId);
    delCat.run(categoryId);
  };

  db.exec('BEGIN');
  try {
    const existing = db.prepare('SELECT category_id, name FROM category').all() as {
      category_id: number;
      name: string;
    }[];
    const seedNames = new Set<string>(SEED_CATEGORY_ROWS.map((c) => c.name));
    for (const row of existing) {
      if (seedNames.has(row.name)) dropIfFree(row.category_id);
    }

    const insCat = db.prepare(
      'INSERT OR IGNORE INTO category (category_id, name, icon) VALUES (?, ?, ?)',
    );
    const updCat = db.prepare('UPDATE category SET name = ?, icon = ? WHERE category_id = ?');
    for (const c of SEED_CATEGORY_ROWS) {
      insCat.run(c.category_id, c.name, c.icon);
      updCat.run(c.name, c.icon, c.category_id);
    }

    const wordsByCat = new Map<number, string[]>();
    for (const k of seedKeywordRows()) {
      const list = wordsByCat.get(k.category_id) ?? [];
      list.push(k.word);
      wordsByCat.set(k.category_id, list);
    }
    const hasWord = db.prepare(
      'SELECT 1 AS n FROM keyword WHERE category_id = ? AND word = ?',
    );
    const insKw = db.prepare(
      'INSERT INTO keyword (category_id, word, source) VALUES (?, ?, ?)',
    );
    for (const [categoryId, words] of wordsByCat) {
      const placeholders = words.map(() => '?').join(', ');
      db.prepare(
        `DELETE FROM keyword WHERE category_id = ? AND word NOT IN (${placeholders})`,
      ).run(categoryId, ...words);
      for (const word of words) {
        const found = hasWord.get(categoryId, word) as { n: number } | undefined;
        if (found) continue;
        insKw.run(categoryId, word, 'seed');
      }
    }

    const left = db.prepare('SELECT category_id FROM category').all() as { category_id: number }[];
    for (const row of left) dropIfFree(row.category_id);

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** Upsert seed catalog so existing DBs pick up new models without reset. */
function syncCatalog(db: AppDatabase): void {
  const insProd = db.prepare(`
    INSERT INTO product_cache (product_key, category_id, brand, model, summary, icon, price, specs, source, researched_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(product_key) DO UPDATE SET
      category_id = excluded.category_id,
      brand = excluded.brand,
      model = excluded.model,
      summary = excluded.summary,
      icon = excluded.icon,
      price = excluded.price,
      specs = excluded.specs,
      researched_at = excluded.researched_at
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

  const existingAliases = new Set(
    (
      db.prepare('SELECT lower(alias) AS a FROM product_alias').all() as { a: string }[]
    ).map((r) => r.a),
  );
  const maxAlias = db.prepare('SELECT COALESCE(MAX(alias_id), 0) AS n FROM product_alias').get() as {
    n: number;
  };
  let nextId = maxAlias.n + 1;
  const insAlias = db.prepare(
    'INSERT INTO product_alias (alias_id, product_key, alias, source) VALUES (?, ?, ?, ?)',
  );
  for (const a of seedProductAliasRows()) {
    const key = a.alias.toLowerCase();
    if (existingAliases.has(key)) continue;
    insAlias.run(nextId++, a.product_key, a.alias, a.source);
    existingAliases.add(key);
  }
}

export { DEFAULT_PATH };
