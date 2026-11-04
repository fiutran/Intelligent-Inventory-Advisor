/**
 * Product matcher.
 *
 * Rule: we only claim to know a product when every word of one of its names is in
 * the query, and nothing else in the query points at a different model.
 * "iPhone 16 Pro Max" is not an "iPhone 16 Pro". "AirPods Max" is not "AirPods Pro".
 *
 * When the query is a less specific version of known products ("iPhone", "Sony a7"),
 * we return them as suggestions so the UI can ask "Did you mean…?" and never
 * silently substitute a different product.
 */
import type { CatalogItem } from './types.js';

/** Words that never distinguish one model from another. */
const NOISE = new Set([
  // brands (a model name is what identifies the product, not the maker)
  'apple', 'google', 'samsung', 'sony', 'anker', 'bose', 'jabra', 'xiaomi', 'oneplus',
  'lg', 'dell', 'hp', 'lenovo', 'asus', 'microsoft', 'nothing', 'sennheiser',
  // filler
  'the', 'a', 'an', 'new', 'gen', 'generation', 'edition', 'model', 'version',
  'unlocked', 'with', 'and', 'usb', 'c', 'wireless',
  // colours / finishes
  'black', 'white', 'silver', 'gold', 'blue', 'red', 'green', 'purple', 'pink', 'gray',
  'grey', 'titanium', 'natural', 'desert', 'graphite', 'midnight', 'starlight', 'space',
  'deep', 'obsidian', 'porcelain', 'hazel', 'rose', 'mint', 'yellow', 'ultramarine', 'teal',
]);

/** Words that turn a product into a different model. */
const VARIANT = new Set([
  'pro', 'max', 'plus', 'ultra', 'mini', 'air', 'se', 'lite', 'fe', 'xl', 'fold', 'flip',
  'neo', 'edge', 'note', 'slim', 'studio',
]);

/** Words that mean the person is shopping for an accessory, not the device. */
const ACCESSORY = new Set([
  'case', 'cover', 'protector', 'strap', 'band', 'cable', 'charger', 'adapter', 'stand',
  'mount', 'skin', 'dock', 'sleeve', 'keyboard', 'pencil',
]);

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/α/g, 'a')
    .replace(/\b\d+\s*(gb|tb)\b/g, ' ') // storage size is a variant of the same model
    .replace(/(\d+)(st|nd|rd|th)\b/g, '$1') // 2nd → 2
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/([a-z])(\d)/g, '$1 $2') // a7 → a 7, s24 → s 24
    .replace(/(\d)([a-z])/g, '$1 $2') // 16pro → 16 pro, 100w → 100 w
    .split(' ')
    .filter(Boolean)
    .map((t) => (t === 'watt' || t === 'watts' ? 'w' : t));
}

/** Canonical form used for storing aliases. */
export function normalizeProductQuery(q: string): string {
  return tokenize(q).join(' ');
}

/** Same product, ignoring brand, colour and word order. */
export function sameProduct(a: string, b: string): boolean {
  const key = (s: string) =>
    tokenize(s)
      .filter((t) => !NOISE.has(t))
      .sort()
      .join(' ');
  const ka = key(a);
  return ka.length > 0 && ka === key(b);
}

interface Indexed {
  item: CatalogItem;
  /** Token lists for the name and every alias. */
  identities: string[][];
  /** Every token across all identities. */
  all: Set<string>;
}

const indexCache = new WeakMap<CatalogItem[], Indexed[]>();

function indexCatalog(catalog: CatalogItem[]): Indexed[] {
  const cached = indexCache.get(catalog);
  if (cached) return cached;
  const idx = catalog.map((item) => {
    const identities = [item.name, ...item.aliases].map(tokenize).filter((t) => t.length > 0);
    return { item, identities, all: new Set(identities.flat()) };
  });
  indexCache.set(catalog, idx);
  return idx;
}

const isNumber = (t: string) => /^\d/.test(t);

export interface MatchResult {
  product: CatalogItem | null;
  /** Less specific or ambiguous matches, best first. Empty when product is set. */
  suggestions: CatalogItem[];
}

export function matchProduct(query: string, catalog: CatalogItem[]): MatchResult {
  const q = tokenize(query);
  if (q.length === 0) return { product: null, suggestions: [] };
  const qs = new Set(q);
  const idx = indexCatalog(catalog);

  // Tokens that identify *some* product: seeing one that isn't ours means a different product.
  const tokenOwners = new Map<string, number>();
  for (const p of idx) for (const t of p.all) tokenOwners.set(t, (tokenOwners.get(t) ?? 0) + 1);

  const distinguishes = (t: string, p: Indexed) => {
    if (p.all.has(t) || NOISE.has(t)) return false;
    return (
      isNumber(t) || VARIANT.has(t) || ACCESSORY.has(t) || t.length === 1 || tokenOwners.has(t)
    );
  };

  let best: { p: Indexed; score: number }[] = [];
  for (const p of idx) {
    const score = Math.max(
      0,
      ...p.identities.filter((id) => id.every((t) => qs.has(t))).map((id) => id.length),
    );
    if (score === 0) continue;
    if (q.some((t) => distinguishes(t, p))) continue;
    if (!best.length || score > best[0].score) best = [{ p, score }];
    else if (score === best[0].score) best.push({ p, score });
  }

  if (best.length === 1) return { product: best[0].p.item, suggestions: [] };
  if (best.length > 1) return { product: null, suggestions: best.map((b) => b.p.item) };

  return { product: null, suggestions: suggest(q, idx) };
}

/** Products the query is a less specific version of ("ipad" → iPad Air). */
function suggest(q: string[], idx: Indexed[]): CatalogItem[] {
  const core = q.filter((t) => !NOISE.has(t));
  // Need at least one word that names something ("sony", "ipad"), not just "pro" or "16".
  const hasNameWord = q.some((t) => !isNumber(t) && !VARIANT.has(t) && t.length > 1);
  if (!hasNameWord) return [];
  return idx
    .filter((p) => core.every((t) => p.all.has(t)) && q.some((t) => p.all.has(t)))
    .map((p) => ({ p, closeness: core.length / p.all.size }))
    .sort((a, b) => b.closeness - a.closeness)
    .slice(0, 3)
    .map((x) => x.p.item);
}
