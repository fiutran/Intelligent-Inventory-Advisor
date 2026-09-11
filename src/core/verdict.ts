import { CATEGORY_LABEL } from '../data/seed.js';
import { compareSpecs, costPerGain, summarizeDelta } from './delta.js';
import type { Candidate, DeltaRow, OwnedItem, Verdict, VerdictKind } from './types.js';

function formatPrice(price: number | null): string {
  return price ? `€${price}` : '-';
}

function buildVerdict(
  kind: VerdictKind,
  tag: string,
  head: string,
  rationale: string,
  meta: Array<[string, string]>,
  candidate: Candidate,
  ownedItem: OwnedItem | null,
  comparison: DeltaRow[] | null,
  suggestSellExisting = false,
): Verdict {
  return {
    kind,
    tag,
    head,
    rationale,
    meta: meta.map(([key, value]) => ({ key, value })),
    candidate,
    ownedItem,
    comparison,
    suggestSellExisting,
  };
}

/** Same model already owned: pure duplication */
function verdictDuplicate(
  candidate: Candidate,
  ownedItem: OwnedItem,
): Verdict {
  return buildVerdict(
    'skip',
    'Verdict · you already own this',
    'You own this exact thing already.',
    `Your ${ownedItem.name} is in your inventory since ${ownedItem.since}. ` +
      'Buying a second one is pure duplication unless the first is broken or gifted away.',
    [
      ['Already owned', '1'],
      ['Would spend', formatPrice(candidate.price)],
      ['New capability', 'None'],
    ],
    candidate,
    ownedItem,
    null,
  );
}

/** Known model + owned in category: full spec delta */
function verdictUpgrade(
  candidate: Candidate,
  ownedItem: OwnedItem,
  comparison: DeltaRow[],
): Verdict {
  const { meaningful, newCount, realGains } = summarizeDelta(comparison);
  const price = candidate.price ?? 0;
  const perGain = costPerGain(candidate.price, realGains);

  let kind: VerdictKind;
  let tag: string;
  let head: string;

  if (realGains <= 1) {
    kind = 'skip';
    tag = 'Verdict · skip for now';
    head = `${realGains || 'No'} real upgrade${realGains === 1 ? '' : 's'}. Not ${formatPrice(price)} worth.`;
  } else if (realGains <= 3) {
    kind = 'wait';
    tag = 'Verdict · borderline';
    head = `${realGains} real upgrades, worth it only if you value them.`;
  } else {
    kind = 'buy';
    tag = 'Verdict · worth it';
    head = `${realGains} real upgrades over what you own.`;
  }

  const newPart = newCount ? ` and ${newCount} are new` : '';
  const rationale =
    `You already own an ${ownedItem.name} (since ${ownedItem.since}). ` +
    `Of ${comparison.length} comparable specs, ${meaningful} improve meaningfully${newPart}. ` +
    'the rest are marginal or identical.';

  return buildVerdict(
    kind,
    tag,
    head,
    rationale,
    [
      ['Real gains', String(realGains)],
      ['Price', formatPrice(candidate.price)],
      ['Cost / gain', perGain != null ? `€${perGain}` : '-'],
    ],
    candidate,
    ownedItem,
    comparison,
  );
}

/** Category overlap but model unknown: redundancy flag only */
function verdictOverlapUnknownModel(
  candidate: Candidate,
  ownedItem: OwnedItem,
  cat: NonNullable<Candidate['cat']>,
): Verdict {
  return buildVerdict(
    'wait',
    'Verdict · redundancy flag',
    `You already own a ${CATEGORY_LABEL[cat]}.`,
    `Your ${ownedItem.name} covers this need (since ${ownedItem.since}). ` +
      'I recognise the category but not the exact model, so I can flag the overlap but cannot score the upgrade yet.',
    [
      ['Overlap', 'Same category'],
      ['Price', formatPrice(candidate.price)],
      ['Scored', 'Need model'],
    ],
    candidate,
    ownedItem,
    null,
  );
}

/** No category overlap: genuine gap */
function verdictNoOverlap(candidate: Candidate, cat: Candidate['cat']): Verdict {
  const label = cat ? CATEGORY_LABEL[cat] : 'match';
  return buildVerdict(
    'clear',
    'Verdict · no overlap',
    'Nothing like it in your inventory.',
    `You do not own a ${label} for this. No redundancy risk: this is a genuine gap, ` +
      'so it is a straight need-vs-want call, not a duplication one.',
    [
      ['Overlap', 'None'],
      ['Price', formatPrice(candidate.price)],
      ['Redundancy', 'Low'],
    ],
    candidate,
    null,
    null,
  );
}

export interface BuildVerdictInput {
  candidate: Candidate;
  ownedItem: OwnedItem | null;
  matched: boolean;
  exactDuplicate: boolean;
}

export function buildVerdictFromContext(input: BuildVerdictInput): Verdict {
  const { candidate, ownedItem, matched, exactDuplicate } = input;

  if (exactDuplicate && ownedItem) {
    return verdictDuplicate(candidate, ownedItem);
  }

  if (matched && ownedItem && candidate.specs) {
    const comparison = compareSpecs(ownedItem, candidate.specs);
    return verdictUpgrade(candidate, ownedItem, comparison);
  }

  if (ownedItem && candidate.cat) {
    return verdictOverlapUnknownModel(candidate, ownedItem, candidate.cat);
  }

  return verdictNoOverlap(candidate, candidate.cat);
}

/** When user buys against a skip/wait verdict, suggest selling the existing item */
export function shouldSuggestSell(verdict: Verdict, boughtAnyway: boolean): boolean {
  if (!boughtAnyway) return false;
  if (!verdict.ownedItem) return false;
  return verdict.kind === 'skip' || verdict.kind === 'wait';
}

export function withSellSuggestion(verdict: Verdict): Verdict {
  return { ...verdict, suggestSellExisting: true };
}
