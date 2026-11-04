import type { Category, OwnedItem, Provenance } from '../core/types.js';
import type { InventoryListItem } from '../core/types.js';
import { normalizeSpecs } from '../core/specs.js';
import { enrichOwnedFromCatalog, findCatalogItem } from '../data/seed.js';
import { CATEGORY_IDS, CATEGORY_ICONS, categoryNameById, inventoryRowToOwned } from '../db/map.js';
import type { InventoryItemRow, InventoryStatus } from '../db/types.js';
import type { AppDatabase } from './db.js';

export type { InventoryListItem };

function parseInventoryRow(raw: Record<string, unknown>): InventoryItemRow {
  return {
    item_id: raw.item_id as number,
    user_id: raw.user_id as number,
    category_id: raw.category_id as number,
    brand: raw.brand as string | null,
    model: raw.model as string,
    summary: raw.summary as string | null,
    icon: raw.icon as string | null,
    price: raw.price as number | null,
    release_year: raw.release_year as number | null,
    specs: JSON.parse(raw.specs as string),
    provenance: raw.provenance as InventoryItemRow['provenance'],
    confidence: raw.confidence as InventoryItemRow['confidence'],
    status: raw.status as InventoryStatus,
    acquired_at: raw.acquired_at as string | null,
  };
}

function rowToListItem(row: InventoryItemRow): InventoryListItem | null {
  const cat = categoryNameById(row.category_id);
  if (!cat) return null;
  if (row.status !== 'owned' && row.status !== 'considering' && row.status !== 'retired') {
    return null;
  }
  let owned = inventoryRowToOwned(row, cat);
  if (row.status === 'owned') {
    owned = enrichOwnedFromCatalog(owned);
  }
  return { ...owned, item_id: row.item_id, status: row.status };
}

function backfillEmptyOwnedSpecs(db: AppDatabase, userId: number): void {
  const rows = db
    .prepare(
      `SELECT * FROM inventory_item
       WHERE user_id = ? AND status = 'owned'
         AND (specs IS NULL OR specs = '[]' OR specs = '')`,
    )
    .all(userId) as Record<string, unknown>[];

  const upd = db.prepare(
    `UPDATE inventory_item
     SET specs = ?, summary = COALESCE(NULLIF(summary, ''), ?), icon = COALESCE(icon, ?)
     WHERE item_id = ?`,
  );

  for (const raw of rows) {
    const row = parseInventoryRow(raw);
    const cat = categoryNameById(row.category_id);
    if (!cat) continue;
    const enriched = enrichOwnedFromCatalog(inventoryRowToOwned(row, cat));
    if (enriched.specs.length === 0) continue;
    upd.run(
      JSON.stringify(enriched.specs),
      enriched.meta || null,
      enriched.icon,
      row.item_id,
    );
  }
}

export function listOwnedInventory(db: AppDatabase, userId: number): OwnedItem[] {
  return listInventory(db, userId)
    .filter((i) => i.status === 'owned')
    .map(({ item_id: _id, status: _s, ...rest }) => rest);
}

export function listInventory(db: AppDatabase, userId: number): InventoryListItem[] {
  backfillEmptyOwnedSpecs(db, userId);

  const rows = db
    .prepare(
      `SELECT * FROM inventory_item
       WHERE user_id = ? AND status IN ('owned', 'considering', 'retired')
       ORDER BY
         CASE status WHEN 'considering' THEN 0 WHEN 'owned' THEN 1 ELSE 2 END,
         item_id DESC`,
    )
    .all(userId) as Record<string, unknown>[];

  return rows.map(parseInventoryRow).map(rowToListItem).filter((x): x is InventoryListItem => x !== null);
}

export function findOwnedInCategory(
  db: AppDatabase,
  userId: number,
  categoryId: number,
): InventoryItemRow | null {
  const raw = db
    .prepare(
      `SELECT * FROM inventory_item
       WHERE user_id = ? AND category_id = ? AND status = 'owned'
       ORDER BY item_id DESC LIMIT 1`,
    )
    .get(userId, categoryId) as Record<string, unknown> | undefined;

  return raw ? parseInventoryRow(raw) : null;
}

export function addInventoryItem(
  db: AppDatabase,
  row: Omit<InventoryItemRow, 'item_id'>,
): number {
  const result = db
    .prepare(`
      INSERT INTO inventory_item (user_id, category_id, brand, model, summary, icon, price, release_year, specs, provenance, confidence, status, acquired_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
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
  return Number(result.lastInsertRowid);
}

export function retireItem(db: AppDatabase, itemId: number): void {
  db.prepare(`UPDATE inventory_item SET status = 'retired' WHERE item_id = ?`).run(itemId);
}

export function removeConsideringByName(db: AppDatabase, userId: number, name: string): void {
  const q = name.toLowerCase();
  db.prepare(
    `DELETE FROM inventory_item
     WHERE user_id = ? AND status = 'considering'
       AND (
         lower(model) = ?
         OR lower(coalesce(brand, '') || ' ' || model) = ?
         OR lower(model) LIKE ?
       )`,
  ).run(userId, q, q, `%${q}%`);
}

export function deleteInventoryItem(db: AppDatabase, userId: number, itemId: number): boolean {
  const result = db
    .prepare(`DELETE FROM inventory_item WHERE item_id = ? AND user_id = ?`)
    .run(itemId, userId);
  return result.changes > 0;
}

export function addConsidering(
  db: AppDatabase,
  userId: number,
  query: string,
  categoryId: number,
  icon: string | null,
): void {
  const existing = db
    .prepare(
      `SELECT item_id FROM inventory_item
       WHERE user_id = ? AND status = 'considering' AND lower(model) = lower(?)`,
    )
    .get(userId, query);
  if (existing) return;

  addInventoryItem(db, {
    user_id: userId,
    category_id: categoryId,
    brand: null,
    model: query,
    summary: 'Thinking about it',
    icon: icon ?? CATEGORY_ICONS[categoryNameById(categoryId) ?? 'phone'],
    price: null,
    release_year: null,
    specs: [],
    provenance: 'manual',
    confidence: null,
    status: 'considering',
    acquired_at: new Date().toISOString().slice(0, 10),
  });
}

export function addManualItem(
  db: AppDatabase,
  input: {
    userId: number;
    categoryId: number;
    name: string;
    price: number | null;
    summary: string | null;
    provenance?: Provenance;
  },
): number {
  const hit = findCatalogItem(input.name);
  const cat = (hit?.cat ?? categoryNameById(input.categoryId) ?? 'phone') as Category;
  const categoryId = hit ? CATEGORY_IDS[hit.cat] : input.categoryId;
  const displayName = hit?.name ?? input.name.trim();
  const nameParts = displayName.split(/\s+/);
  const brand = nameParts.length >= 2 ? nameParts[0] : null;
  const model = nameParts.length >= 2 ? nameParts.slice(1).join(' ') : displayName;
  const specs = hit ? normalizeSpecs(hit.specs, cat) : [];

  return addInventoryItem(db, {
    user_id: input.userId,
    category_id: categoryId,
    brand,
    model,
    summary: input.summary || hit?.meta || null,
    icon: hit?.icon ?? CATEGORY_ICONS[cat],
    price: input.price ?? hit?.price ?? null,
    release_year: null,
    specs,
    provenance: input.provenance ?? 'manual',
    confidence: hit ? 'high' : null,
    status: 'owned',
    acquired_at: new Date().toISOString().slice(0, 10),
  });
}

export function clearUserData(db: AppDatabase, userId: number): void {
  db.prepare(`DELETE FROM recommendation_option WHERE decision_id IN (
    SELECT decision_id FROM decision WHERE user_id = ?
  )`).run(userId);
  db.prepare(`DELETE FROM decision WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM preference_weight WHERE user_id = ?`).run(userId);
  db.prepare(`DELETE FROM inventory_item WHERE user_id = ?`).run(userId);
}

export function addDemoCharger(db: AppDatabase, userId: number): void {
  const exists = db
    .prepare(
      `SELECT 1 FROM inventory_item WHERE user_id = ? AND model LIKE '%65W%' AND status = 'owned'`,
    )
    .get(userId);
  if (exists) return;

  addInventoryItem(db, {
    user_id: userId,
    category_id: 4,
    brand: 'Anker',
    model: '65W USB-C charger',
    summary: 'GaN · 3 ports',
    icon: '🔌',
    price: 45,
    release_year: null,
    specs: [
      { k: 'Power', v: '65 W', w: 'high' },
      { k: 'Tech', v: 'GaN', w: 'low' },
      { k: 'Ports', v: '3', w: 'high' },
    ],
    provenance: 'photo',
    confidence: 'high',
    status: 'owned',
    acquired_at: '~ Mar 2024',
  });
}
