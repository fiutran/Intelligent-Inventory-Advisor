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

const BRAND_WORDS = new Set(['samsung', 'pixel', 'galaxy', 'android', 'iphone', 'sony', 'lg']);

function matchesWord(query: string, word: string): boolean {
  let from = 0;
  while (from <= query.length - word.length) {
    const idx = query.indexOf(word, from);
    if (idx < 0) return false;
    const before = idx === 0 ? '' : query[idx - 1];
    const after = query[idx + word.length] ?? '';
    const beforeOk = before === '' || /[^a-z0-9]/.test(before);
    const afterOk = after === '' || /[^a-z0-9]/.test(after) || after === 's';
    if (beforeOk && afterOk) return true;
    from = idx + 1;
  }
  return false;
}

function guessCategory(query: string): Category | null {
  const q = query.toLowerCase();
  const hits: { cat: Category; word: string }[] = [];
  for (const cat of Object.keys(CATEGORY_WORDS) as Category[]) {
    for (const word of CATEGORY_WORDS[cat]) {
      if (matchesWord(q, word)) hits.push({ cat, word });
    }
  }
  if (!hits.length) return null;
  hits.sort((a, b) => b.word.length - a.word.length);
  const specific = hits.find((hit) => !BRAND_WORDS.has(hit.word));
  return (specific ?? hits[0]).cat;
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
