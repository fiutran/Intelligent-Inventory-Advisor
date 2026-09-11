import { SEED_OWNED } from '../data/seed.js';
import { classify } from './classifier.js';
import { findOwned, findSameName } from './ownership.js';
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

  const ownedItem = findOwned(inventory, candidate.cat);
  const exactDuplicate =
    classifyResult.matched &&
    ownedItem !== null &&
    findSameName(inventory, candidate.name) !== null;

  let verdict = buildVerdictFromContext({
    candidate,
    ownedItem,
    matched: classifyResult.matched,
    exactDuplicate,
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
      if (polished) {
        verdict = { ...verdict, ...polished };
      }
    } catch (err) {
      console.warn('[decide] refineVerdict failed:', err instanceof Error ? err.message : err);
    }
  }

  return { verdict, classify: classifyResult };
}

export type { Verdict, DecideResult };
