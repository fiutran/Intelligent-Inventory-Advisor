import { CATEGORY_LABEL, CATEGORY_WORDS, findCatalogItem, SEED_CATALOG } from '../data/seed.js';
import type {
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
  /** Async lookup for unknown products (LLM / remote cache). */
  researchProduct?: (query: string) => Promise<CatalogItem | null>;
}

function guessCategory(query: string): Category | null {
  const q = query.toLowerCase();
  for (const cat of Object.keys(CATEGORY_WORDS) as Category[]) {
    if (CATEGORY_WORDS[cat].some((w) => q.includes(w))) return cat;
  }
  return null;
}

export { guessCategory };

function iconForCategory(cat: Category | null, owned: OwnedItem[]): string {
  if (!cat) return '🛍️';
  return owned.find((o) => o.cat === cat)?.icon ?? '🛍️';
}

function fromCatalog(hit: CatalogItem, price: number | null): Candidate {
  return {
    name: hit.name,
    icon: hit.icon,
    cat: hit.cat,
    price: price ?? hit.price,
    meta: hit.meta,
    specs: hit.specs,
  };
}

/**
 * Local catalog first, then optional research (LLM), then weak category guess.
 */
export async function classify(
  query: string,
  price: number | null,
  deps: ClassifierDeps = {},
): Promise<ClassifyResult> {
  const catalog = deps.catalog ?? SEED_CATALOG;
  const owned = deps.owned ?? [];
  const hit = findCatalogItem(query, catalog);

  if (hit) {
    return { candidate: fromCatalog(hit, price), matched: true, cacheHit: true };
  }

  if (deps.researchProduct) {
    try {
      const researched = await deps.researchProduct(query);
      if (researched) {
        return {
          candidate: fromCatalog(researched, price),
          matched: true,
          cacheHit: false,
        };
      }
    } catch (err) {
      console.warn('[classify] research failed:', err instanceof Error ? err.message : err);
    }
  }

  const cat = guessCategory(query);
  if (cat) {
    return {
      candidate: {
        name: query,
        icon: iconForCategory(cat, owned),
        cat,
        price,
        meta: CATEGORY_LABEL[cat],
        specs: null,
      },
      matched: false,
      cacheHit: false,
    };
  }

  return {
    candidate: {
      name: query,
      icon: '🛍️',
      cat: null,
      price,
      meta: 'unrecognised',
      specs: null,
    },
    matched: false,
    cacheHit: false,
  };
}

export function resolveSpecs(
  candidate: Candidate,
  specCache: Record<string, Spec[]>,
): Spec[] | null {
  if (candidate.specs) return candidate.specs;
  return specCache[candidate.name] ?? null;
}
