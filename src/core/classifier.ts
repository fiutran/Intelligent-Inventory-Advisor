import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  CATEGORY_WORDS,
  SEED_CATALOG,
} from '../data/seed.js';
import { matchProduct, tokenize } from './match.js';
import type { Candidate, CatalogItem, Category, ClassifyResult, OwnedItem, Spec } from './types.js';

export interface ClassifierDeps {
  catalog?: CatalogItem[];
  owned?: OwnedItem[];
  /** Exact lookup for products outside the catalog (DB cache, then LLM research). */
  researchProduct?: (query: string) => Promise<CatalogItem | null>;
}

/**
 * Best-guess category from words in the query. Whole-word prefix match, so
 * "headphones" is not a phone and "Galaxy Buds" is earbuds, not a phone.
 */
export function guessCategory(query: string): Category | null {
  const padded = ` ${tokenize(query).join(' ')} `;
  // The most specific (longest) matching phrase wins, so "AirPods Max" (headphones)
  // beats "airpod" (earbuds). Ties go to CATEGORY_ORDER, which lists phones last.
  let best: { cat: Category; len: number } | null = null;
  for (const cat of CATEGORY_ORDER) {
    for (const w of CATEGORY_WORDS[cat]) {
      const phrase = tokenize(w).join(' ');
      if (!phrase || !padded.includes(` ${phrase}`)) continue;
      const len = phrase.split(' ').length;
      if (!best || len > best.len) best = { cat, len };
    }
  }
  return best?.cat ?? null;
}

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
 * 1. Exact match in the catalog.
 * 2. Exact lookup elsewhere (cache / LLM), only if the catalog had no exact match.
 * 3. Otherwise: category guess + "did you mean" suggestions. Never a substitute product.
 */
export async function classify(
  query: string,
  price: number | null,
  deps: ClassifierDeps = {},
): Promise<ClassifyResult> {
  const catalog = deps.catalog ?? SEED_CATALOG;
  const owned = deps.owned ?? [];
  const match = matchProduct(query, catalog);

  if (match.product) {
    return {
      candidate: fromCatalog(match.product, price),
      matched: true,
      cacheHit: true,
      suggestions: [],
    };
  }

  if (deps.researchProduct) {
    try {
      const researched = await deps.researchProduct(query);
      if (researched) {
        return {
          candidate: fromCatalog(researched, price),
          matched: true,
          cacheHit: false,
          suggestions: [],
        };
      }
    } catch (err) {
      console.warn('[classify] research failed:', err instanceof Error ? err.message : err);
    }
  }

  const suggestions = match.suggestions.map((s) => s.name);
  const cat = guessCategory(query) ?? match.suggestions[0]?.cat ?? null;
  return {
    candidate: {
      name: query.trim(),
      icon: iconForCategory(cat, owned),
      cat,
      price,
      meta: cat ? CATEGORY_LABEL[cat] : 'unrecognised',
      specs: null,
    },
    matched: false,
    cacheHit: false,
    suggestions,
  };
}

export function resolveSpecs(
  candidate: Candidate,
  specCache: Record<string, Spec[]>,
): Spec[] | null {
  if (candidate.specs) return candidate.specs;
  return specCache[candidate.name] ?? null;
}
