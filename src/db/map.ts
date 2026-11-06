import { CATEGORY_WORDS, SEED_CATALOG, SEED_OWNED } from '../data/seed.js';
import type { CatalogItem, Category, OwnedItem, Spec, Verdict } from '../core/types.js';
import type { ClassifyResult } from '../core/types.js';
import type {
  CategoryRow,
  DecisionBranch,
  DecisionPayload,
  InventoryItemRow,
  KeywordRow,
  NewDecisionRow,
  ProductAliasRow,
  ProductCacheRow,
  Provenance,
} from './types.js';

const CATEGORY_IDS: Record<string, number> = {
  phone: 1,
  earbuds: 2,
  headphones: 3,
  charger: 4,
  camera: 5,
  tablet: 6,
  laptop: 7,
  watch: 8,
  tv: 9,
  speaker: 10,
  'personal-care': 11,
  kitchen: 12,
  gaming: 13,
  'smart-home': 14,
  health: 19,
  appliances: 22,
  ereader: 43,
  microphone: 44,
  monitor: 45,
  keyboard: 46,
  mouse: 47,
  printer: 48,
  webcam: 49,
  storage: 50,
  networking: 51,
  components: 52,
  streaming: 53,
  projector: 54,
  drone: 55,
  'power-bank': 56,
  lighting: 57,
  fitness: 58,
  'car-electronics': 59,
  'power-tools': 60,
  'music-tech': 61,
};

const CATEGORY_ICONS: Record<Category, string> = {
  phone: '📱',
  earbuds: '🎧',
  headphones: '🎧',
  charger: '🔌',
  camera: '📷',
  tablet: '📱',
  laptop: '💻',
  watch: '⌚',
  tv: '📺',
  speaker: '🔊',
  'personal-care': '🧴',
  kitchen: '🍳',
  gaming: '🎮',
  'smart-home': '🏠',
  health: '🩺',
  appliances: '🌀',
  ereader: '📖',
  microphone: '🎙️',
  monitor: '🖥️',
  keyboard: '⌨️',
  mouse: '🖱️',
  printer: '🖨️',
  webcam: '📷',
  storage: '💾',
  networking: '📡',
  components: '🧩',
  streaming: '📺',
  projector: '📽️',
  drone: '🚁',
  'power-bank': '🔋',
  lighting: '💡',
  fitness: '🏃',
  'car-electronics': '🚗',
  'power-tools': '🔧',
  'music-tech': '🎹',
};

export const SEED_CATEGORY_ROWS: CategoryRow[] = Object.entries(CATEGORY_IDS).map(
  ([name, category_id]) => ({
    category_id,
    name: name as CategoryRow['name'],
    icon: CATEGORY_ICONS[name as Category],
  }),
);

export function seedKeywordRows(): KeywordRow[] {
  let keyword_id = 1;
  const rows: KeywordRow[] = [];
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
    const category_id = CATEGORY_IDS[cat];
    for (const word of words) {
      rows.push({ keyword_id: keyword_id++, category_id, word, source: 'seed' });
    }
  }
  return rows;
}

function splitBrandModel(name: string): { brand: string | null; model: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { brand: null, model: name };
  return { brand: parts[0], model: parts.slice(1).join(' ') };
}

function productKey(item: { name: string; cat: string }): string {
  return `${item.cat}:${item.name.toLowerCase().replace(/\s+/g, '-')}`;
}

function categoryId(cat: Category): number {
  return CATEGORY_IDS[cat];
}

/** Domain OwnedItem → inventory_item row */
export function ownedToInventoryRow(
  item: OwnedItem,
  opts: { item_id: number; user_id: number; status?: InventoryItemRow['status'] },
): InventoryItemRow {
  const { brand, model } = splitBrandModel(item.name);
  return {
    item_id: opts.item_id,
    user_id: opts.user_id,
    category_id: categoryId(item.cat),
    brand,
    model,
    summary: item.meta,
    icon: item.icon,
    price: item.paid,
    release_year: null,
    specs: item.specs,
    provenance: item.prov as Provenance,
    confidence: null,
    status: opts.status ?? 'owned',
    acquired_at: item.since,
  };
}

/** inventory_item row → domain OwnedItem (for decide() input) */
export function inventoryRowToOwned(row: InventoryItemRow, catName: Category): OwnedItem {
  const name = row.brand ? `${row.brand} ${row.model}` : row.model;
  return {
    cat: catName,
    icon: row.icon ?? CATEGORY_ICONS[catName],
    name,
    paid: row.price ?? 0,
    since: row.acquired_at ?? 'unknown',
    prov: row.provenance,
    meta: row.summary ?? '',
    specs: row.specs,
  };
}

/** Catalog entry → product_cache row */
export function catalogToProductCache(item: CatalogItem): ProductCacheRow {
  const { brand, model } = splitBrandModel(item.name);
  const now = new Date().toISOString();
  return {
    product_key: productKey(item),
    category_id: categoryId(item.cat),
    brand,
    model,
    summary: item.meta,
    icon: item.icon,
    price: item.price,
    specs: item.specs as Spec[],
    source: 'seed',
    researched_at: now,
    expires_at: null,
  };
}

/** Catalog aliases → product_alias rows */
export function catalogToAliasRows(item: CatalogItem, startId: number): ProductAliasRow[] {
  const key = productKey(item);
  return item.aliases.map((alias, i) => ({
    alias_id: startId + i,
    product_key: key,
    alias: alias.toLowerCase(),
    source: 'seed' as const,
  }));
}

export function seedInventoryRows(user_id = 1): InventoryItemRow[] {
  return SEED_OWNED.map((item, i) => ownedToInventoryRow(item, { item_id: i + 1, user_id }));
}

export function seedProductCacheRows(): ProductCacheRow[] {
  return SEED_CATALOG.map(catalogToProductCache);
}

export function seedProductAliasRows(): ProductAliasRow[] {
  let alias_id = 1;
  const rows: ProductAliasRow[] = [];
  for (const item of SEED_CATALOG) {
    const aliases = catalogToAliasRows(item, alias_id);
    rows.push(...aliases);
    alias_id += aliases.length;
  }
  return rows;
}

export function branchFromVerdictContext(
  verdict: Verdict,
  classify: Pick<ClassifyResult, 'matched'>,
): DecisionBranch {
  const exactDuplicate =
    classify.matched &&
    verdict.ownedItem !== null &&
    verdict.candidate.name === verdict.ownedItem.name;

  if (exactDuplicate) return 'duplicate';
  if (classify.matched && verdict.ownedItem && verdict.comparison) return 'upgrade';
  if (verdict.ownedItem) return 'overlap_unknown';
  if (classify.matched) return 'gap';
  return 'unrecognised';
}

/** Build frozen payload for decision.payload (replay Verdict screen without re-run) */
export function verdictToPayload(
  verdict: Verdict,
  classify: ClassifyResult,
  productKeyOverride?: string | null,
): DecisionPayload {
  return {
    kind: verdict.kind,
    tag: verdict.tag,
    head: verdict.head,
    rationale: verdict.rationale,
    meta: verdict.meta,
    comparison: verdict.comparison,
    candidate: {
      name: verdict.candidate.name,
      icon: verdict.candidate.icon,
      cat: verdict.candidate.cat,
      price: verdict.candidate.price,
      meta: verdict.candidate.meta,
      product_key: productKeyOverride ?? null,
    },
    classify: {
      matched: classify.matched,
      cacheHit: classify.cacheHit,
    },
  };
}

/** Build row ready for INSERT into decision */
export function verdictToNewDecision(input: {
  user_id: number;
  query: string;
  stated_price: number | null;
  verdict: Verdict;
  classify: ClassifyResult;
  purchased: boolean;
  bought_against_advice?: boolean;
  matched_item_id?: number | null;
  retired_item_id?: number | null;
  chosen_product_key?: string | null;
}): NewDecisionRow {
  const { verdict, classify } = input;
  const branch = branchFromVerdictContext(verdict, classify);
  const pk =
    input.chosen_product_key ??
    (classify.matched && verdict.candidate.cat
      ? productKey({ name: verdict.candidate.name, cat: verdict.candidate.cat })
      : null);

  return {
    user_id: input.user_id,
    category_id: verdict.candidate.cat ? categoryId(verdict.candidate.cat) : null,
    query: input.query,
    branch,
    matched_item_id: input.matched_item_id ?? null,
    verdict: verdict.kind,
    stated_price: input.stated_price,
    payload: verdictToPayload(verdict, classify, pk),
    bought_against_advice: input.bought_against_advice ?? false,
    retired_item_id: input.retired_item_id ?? null,
    chosen_product_key: pk,
    purchased: input.purchased,
  };
}

export function categoryNameById(id: number): Category | null {
  for (const [name, cid] of Object.entries(CATEGORY_IDS)) {
    if (cid === id) return name as Category;
  }
  return null;
}

/** @deprecated use branchFromVerdictContext */
export function branchFromVerdict(
  _kind: string,
  matched: boolean,
  exactDuplicate: boolean,
  owned: boolean,
): DecisionBranch {
  if (exactDuplicate) return 'duplicate';
  if (matched && owned) return 'upgrade';
  if (owned) return 'overlap_unknown';
  if (matched) return 'gap';
  return 'unrecognised';
}

export { CATEGORY_IDS, CATEGORY_ICONS, productKey };
