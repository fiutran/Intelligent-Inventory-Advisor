import type { Category, OwnedItem } from './types.js';

export function ownedInCategory(inventory: OwnedItem[], cat: Category | null): OwnedItem[] {
  if (!cat) return [];
  return inventory.filter((o) => o.cat === cat);
}

export function findOwned(inventory: OwnedItem[], cat: Category | null): OwnedItem | null {
  return ownedInCategory(inventory, cat)[0] ?? null;
}

export function findSameName(inventory: OwnedItem[], name: string): OwnedItem | null {
  const needle = name.trim().toLowerCase();
  return inventory.find((o) => o.name.trim().toLowerCase() === needle) ?? null;
}

/** Prefer the owned item whose name actually shows up in what they're about to buy. */
export function relevantOwned(items: OwnedItem[], query: string): OwnedItem | null {
  if (items.length === 0) return null;
  const q = query.toLowerCase();
  let best = items[0];
  let bestScore = -1;
  for (const item of items) {
    const words = item.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const score = words.reduce((n, w) => n + (q.includes(w) ? w.length : 0), 0);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

export function ownsCategory(inventory: OwnedItem[], cat: Category | null): boolean {
  return findOwned(inventory, cat) !== null;
}
