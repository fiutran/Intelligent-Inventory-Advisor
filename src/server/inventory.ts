import type { OwnedItem } from '../core/types.js';
import { categoryNameById, inventoryRowToOwned } from '../db/map.js';
import type { InventoryItemRow, InventoryStatus } from '../db/types.js';
import type { AppDatabase } from './db.js';

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

export function listOwnedInventory(db: AppDatabase, userId: number): OwnedItem[] {
  const rows = db
    .prepare(
      `SELECT * FROM inventory_item
       WHERE user_id = ? AND status = 'owned'
       ORDER BY item_id DESC`,
    )
    .all(userId) as Record<string, unknown>[];

  return rows
    .map(parseInventoryRow)
    .map((row) => {
      const cat = categoryNameById(row.category_id);
      if (!cat) return null;
      return inventoryRowToOwned(row, cat);
    })
    .filter((x): x is OwnedItem => x !== null);
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

export function addConsidering(
  db: AppDatabase,
  userId: number,
  query: string,
  categoryId: number,
): void {
  addInventoryItem(db, {
    user_id: userId,
    category_id: categoryId,
    brand: null,
    model: query,
    summary: 'considering',
    icon: null,
    price: null,
    release_year: null,
    specs: [],
    provenance: 'manual',
    confidence: null,
    status: 'considering',
    acquired_at: new Date().toISOString(),
  });
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
