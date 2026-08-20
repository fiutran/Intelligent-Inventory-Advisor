import { CATEGORY_LABEL, CATEGORY_WORDS, SEED_CATALOG } from '../data/seed.js';
import type {
  AIAdapter,
  Candidate,
  CatalogItem,
  Category,
  ClassifyResult,
  OwnedItem,
  Spec,
} from './types.js';

export interface ClassifierDeps {
  catalog?: CatalogItem[];
  owned?: OwnedItem[];
  ai?: AIAdapter;
}

function guessCategory(query: string): Category | null {
  const q = query.toLowerCase();
  for (const cat of Object.keys(CATEGORY_WORDS) as Category[]) {
    if (CATEGORY_WORDS[cat].some((w) => q.includes(w))) return cat;
  }
  return null;
}

function findCatalogHit(query: string, catalog: CatalogItem[]): CatalogItem | undefined {
  const q = query.toLowerCase();
  return catalog.find((c) => c.aliases.some((a) => q.includes(a) || a.includes(q)));
}

function iconForCategory(cat: Category | null, owned: OwnedItem[]): string {
  if (!cat) return '🛍️';
  return owned.find((o) => o.cat === cat)?.icon ?? '🛍️';
}

/**
 * Local-first classifier. Falls back to AI adapter only on a full miss.
 */
export async function classify(
  query: string,
  price: number | null,
  deps: ClassifierDeps = {},
): Promise<ClassifyResult> {
  const catalog = deps.catalog ?? SEED_CATALOG;
  const owned = deps.owned ?? [];
  const hit = findCatalogHit(query, catalog);

  if (hit) {
    const candidate: Candidate = {
      name: hit.name,
      icon: hit.icon,
      cat: hit.cat,
      price: price ?? hit.price,
      meta: hit.meta,
      specs: hit.specs,
    };
    return { candidate, matched: true, cacheHit: true };
  }

  const cat = guessCategory(query);
  if (cat) {
    const candidate: Candidate = {
      name: query,
      icon: iconForCategory(cat, owned),
      cat,
      price,
      meta: CATEGORY_LABEL[cat],
      specs: null,
    };
    return { candidate, matched: false, cacheHit: false };
  }

  if (deps.ai) {
    const aiResult = await deps.ai.classify(query);
    const candidate: Candidate = {
      name: aiResult.name || query,
      icon: iconForCategory(aiResult.cat, owned),
      cat: aiResult.cat,
      price,
      meta: aiResult.cat ? CATEGORY_LABEL[aiResult.cat] : 'unrecognised',
      specs: null,
    };
    return { candidate, matched: false, cacheHit: false };
  }

  const candidate: Candidate = {
    name: query,
    icon: '🛍️',
    cat: null,
    price,
    meta: 'unrecognised',
    specs: null,
  };
  return { candidate, matched: false, cacheHit: false };
}

export function resolveSpecs(
  candidate: Candidate,
  specCache: Record<string, Spec[]>,
): Spec[] | null {
  if (candidate.specs) return candidate.specs;
  return specCache[candidate.name] ?? null;
}
