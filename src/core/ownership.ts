import type { Category, OwnedItem } from './types.js';

export function findOwned(inventory: OwnedItem[], cat: Category | null): OwnedItem | null {
  if (!cat) return null;
  return inventory.find((o) => o.cat === cat) ?? null;
}

export function findSameName(inventory: OwnedItem[], name: string): OwnedItem | null {
  return inventory.find((o) => o.name === name) ?? null;
}

export function ownsCategory(inventory: OwnedItem[], cat: Category | null): boolean {
  return findOwned(inventory, cat) !== null;
}
