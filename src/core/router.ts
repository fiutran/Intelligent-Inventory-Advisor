import { SEED_OWNED } from '../data/seed.js';
import { classify } from './classifier.js';
import { findOwned, findSameName } from './ownership.js';
import { buildVerdictFromContext } from './verdict.js';
import type {
  AIAdapter,
  AppState,
  CatalogItem,
  DecideInput,
  DecideResult,
  OwnedItem,
  ProductSpecsAdapter,
  Verdict,
} from './types.js';

export interface RouterDeps {
  catalog?: CatalogItem[];
  inventory?: OwnedItem[];
  state?: AppState;
  ai?: AIAdapter;
  productSpecs?: ProductSpecsAdapter;
}

/**
 * Main entry: type product → classify → ownership check → delta → verdict.
 * AI and product-spec adapters are called only on cache miss (not wired in v0).
 */
export async function decide(input: DecideInput, deps: RouterDeps = {}): Promise<DecideResult> {
  const inventory = deps.inventory ?? deps.state?.inventory ?? SEED_OWNED;
  const specCache = deps.state?.specCache ?? {};

  const price =
    input.price != null && !Number.isNaN(input.price) ? input.price : null;

  const classifyResult = await classify(input.query, price, {
    catalog: deps.catalog,
    owned: inventory,
    ai: deps.ai,
  });

  let { candidate } = classifyResult;

  // Spec cache lookup on miss (throws if adapter not implemented)
  if (!candidate.specs && deps.productSpecs) {
    const cached = specCache[candidate.name];
    if (cached) {
      candidate = { ...candidate, specs: cached };
    }
  }

  const ownedItem = findOwned(inventory, candidate.cat);
  const exactDuplicate =
    classifyResult.matched &&
    ownedItem !== null &&
    findSameName(inventory, candidate.name) !== null;

  const verdict = buildVerdictFromContext({
    candidate,
    ownedItem,
    matched: classifyResult.matched,
    exactDuplicate,
  });

  return { verdict, classify: classifyResult };
}

export type { Verdict, DecideResult };
