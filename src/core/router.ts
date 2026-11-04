import { SEED_OWNED } from '../data/seed.js';
import { classify } from './classifier.js';
import { sameProduct } from './match.js';
import { findOwned } from './ownership.js';
import { buildVerdictFromContext } from './verdict.js';
import type {
  AppState,
  CatalogItem,
  DecideInput,
  DecideResult,
  OwnedItem,
  Verdict,
  VerdictKind,
} from './types.js';

export interface RouterDeps {
  catalog?: CatalogItem[];
  inventory?: OwnedItem[];
  state?: AppState;
  /** Clock override for tests (device age). */
  now?: Date;
  researchProduct?: (query: string) => Promise<CatalogItem | null>;
  refineVerdict?: (input: {
    candidate: DecideResult['verdict']['candidate'];
    ownedItem: OwnedItem | null;
    comparison: DecideResult['verdict']['comparison'];
    draft: Pick<Verdict, 'kind' | 'tag' | 'head' | 'rationale'>;
  }) => Promise<{
    kind: VerdictKind;
    tag: string;
    head: string;
    rationale: string;
  } | null>;
}

/**
 * Main entry: type product → classify → ownership check → delta → verdict.
 * Optional researchProduct (LLM) fills unknown models; optional refineVerdict polishes copy.
 */
export async function decide(input: DecideInput, deps: RouterDeps = {}): Promise<DecideResult> {
  const inventory = deps.inventory ?? deps.state?.inventory ?? SEED_OWNED;

  const price =
    input.price != null && !Number.isNaN(input.price) ? input.price : null;

  const classifyResult = await classify(input.query, price, {
    catalog: deps.catalog,
    owned: inventory,
    researchProduct: deps.researchProduct,
  });

  const { candidate } = classifyResult;

  // Prefer the exact same model if it's owned; otherwise the newest item in the category.
  const duplicate = classifyResult.matched
    ? (inventory.find((o) => sameProduct(o.name, candidate.name)) ?? null)
    : null;
  const ownedItem = duplicate ?? findOwned(inventory, candidate.cat);

  let verdict = buildVerdictFromContext({
    candidate,
    ownedItem,
    matched: classifyResult.matched,
    exactDuplicate: duplicate !== null,
    now: deps.now,
  });

  if (deps.refineVerdict) {
    try {
      const polished = await deps.refineVerdict({
        candidate: verdict.candidate,
        ownedItem: verdict.ownedItem,
        comparison: verdict.comparison,
        draft: {
          kind: verdict.kind,
          tag: verdict.tag,
          head: verdict.head,
          rationale: verdict.rationale,
        },
      });
      // The LLM may only reword the explanation. The verdict and its tag come from
      // the rules, so the headline can never contradict the comparison table.
      if (polished) {
        verdict = { ...verdict, head: polished.head, rationale: polished.rationale };
      }
    } catch (err) {
      console.warn('[decide] refineVerdict failed:', err instanceof Error ? err.message : err);
    }
  }

  return { verdict, classify: classifyResult };
}

export type { Verdict, DecideResult };
