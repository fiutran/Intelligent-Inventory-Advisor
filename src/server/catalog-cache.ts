import { findCatalogItem, normalizeProductQuery, withOwnershipWeights } from '../data/seed.js';
import type { CatalogItem, Category, Spec } from '../core/types.js';
import { CATEGORY_IDS, CATEGORY_ICONS, categoryNameById, productKey } from '../db/map.js';
import type { AppDatabase } from './db.js';
import type { ResearchedProduct } from '../adapters/llm.js';

function splitBrandModel(name: string): { brand: string | null; model: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { brand: null, model: name };
  return { brand: parts[0], model: parts.slice(1).join(' ') };
}

function rowToCatalog(raw: Record<string, unknown>, aliases: string[]): CatalogItem | null {
  const cat = categoryNameById(raw.category_id as number);
  if (!cat) return null;
  const brand = raw.brand as string | null;
  const model = raw.model as string;
  const name = brand ? `${brand} ${model}` : model;
  let specs: Spec[] = [];
  try {
    specs = JSON.parse((raw.specs as string) || '[]') as Spec[];
  } catch {
    specs = [];
  }
  return {
    aliases,
    cat,
    icon: (raw.icon as string) || CATEGORY_ICONS[cat],
    name,
    price: (raw.price as number) ?? 0,
    meta: (raw.summary as string) || '',
    specs: withOwnershipWeights(specs, cat),
  };
}

/** Look up a product in SQLite cache (including seed + LLM-researched). */
export function findCachedProduct(db: AppDatabase, query: string): CatalogItem | null {
  const q = normalizeProductQuery(query);
  if (!q) return null;

  const byAlias = db
    .prepare(
      `SELECT p.* FROM product_alias a
       JOIN product_cache p ON p.product_key = a.product_key
       WHERE lower(a.alias) = ? LIMIT 1`,
    )
    .get(q) as Record<string, unknown> | undefined;

  if (byAlias) {
    const aliases = (
      db
        .prepare(`SELECT alias FROM product_alias WHERE product_key = ?`)
        .all(byAlias.product_key as string) as { alias: string }[]
    ).map((r) => r.alias);
    return rowToCatalog(byAlias, aliases);
  }

  const rows = db.prepare(`SELECT * FROM product_cache`).all() as Record<string, unknown>[];
  for (const raw of rows) {
    const brand = raw.brand as string | null;
    const model = raw.model as string;
    const name = brand ? `${brand} ${model}` : model;
    if (normalizeProductQuery(name) === q || normalizeProductQuery(name).includes(q) || q.includes(normalizeProductQuery(name))) {
      const aliases = (
        db
          .prepare(`SELECT alias FROM product_alias WHERE product_key = ?`)
          .all(raw.product_key as string) as { alias: string }[]
      ).map((r) => r.alias);
      const item = rowToCatalog(raw, aliases);
      if (item) return item;
    }
  }
  return null;
}

export function upsertResearchedProduct(
  db: AppDatabase,
  product: ResearchedProduct,
  query: string,
): CatalogItem {
  const key = productKey({ name: product.name, cat: product.cat });
  const { brand, model } = splitBrandModel(product.name);
  const now = new Date().toISOString();
  const specs = withOwnershipWeights(product.specs, product.cat);

  db.prepare(`
    INSERT INTO product_cache (product_key, category_id, brand, model, summary, icon, price, specs, source, researched_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ai', ?, NULL)
    ON CONFLICT(product_key) DO UPDATE SET
      summary = excluded.summary,
      icon = excluded.icon,
      price = excluded.price,
      specs = excluded.specs,
      source = excluded.source,
      researched_at = excluded.researched_at
  `).run(
    key,
    CATEGORY_IDS[product.cat],
    brand,
    model,
    product.meta,
    product.icon,
    product.price,
    JSON.stringify(specs),
    now,
  );

  const aliases = new Set(
    [query, product.name, ...product.aliases]
      .map((a) => normalizeProductQuery(a))
      .filter(Boolean),
  );

  const maxAlias = db.prepare('SELECT COALESCE(MAX(alias_id), 0) AS n FROM product_alias').get() as {
    n: number;
  };
  let nextId = maxAlias.n + 1;
  const ins = db.prepare(
    `INSERT OR IGNORE INTO product_alias (alias_id, product_key, alias, source) VALUES (?, ?, ?, 'ai')`,
  );
  for (const alias of aliases) {
    ins.run(nextId++, key, alias);
  }

  return {
    aliases: [...aliases],
    cat: product.cat,
    icon: product.icon,
    name: product.name,
    price: product.price ?? 0,
    meta: product.meta,
    specs,
  };
}

/** Resolve a product: seed catalog → DB cache → optional LLM research (caller). */
export function resolveLocalProduct(
  db: AppDatabase,
  query: string,
  seedHit: ReturnType<typeof findCatalogItem>,
): CatalogItem | null {
  if (seedHit) return seedHit;
  return findCachedProduct(db, query);
}

export function persistOwnedSpecs(
  db: AppDatabase,
  itemId: number,
  specs: Spec[],
  meta?: string,
  icon?: string,
): void {
  db.prepare(
    `UPDATE inventory_item
     SET specs = ?,
         summary = COALESCE(NULLIF(summary, ''), ?),
         icon = COALESCE(icon, ?)
     WHERE item_id = ?`,
  ).run(JSON.stringify(specs), meta ?? null, icon ?? null, itemId);
}

export type { Category };
