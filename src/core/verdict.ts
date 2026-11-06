import { CATEGORY_AREA, CATEGORY_LABEL } from '../data/seed.js';
import { formatMoney, type CurrencyCode } from './currency.js';
import { compareSpecs, summarizeDelta } from './delta.js';
import type { Candidate, DeltaRow, OwnedItem, Verdict, VerdictKind } from './types.js';

function formatPrice(price: number | null, currency: CurrencyCode): string {
  return formatMoney(price, currency);
}

function spendPhrase(price: number | null, currency: CurrencyCode): string {
  return price ? formatMoney(price, currency) : 'the money';
}

function friendlySince(since: string): string {
  const iso = since.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return since;
  const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
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
  currency: CurrencyCode,
): Verdict {
  return buildVerdict(
    'skip',
    'You already have it',
    'You already own this.',
    `${ownedItem.name} has been yours since ${friendlySince(ownedItem.since)}. ` +
      'A second one only makes sense if the first is broken, lost, or a gift for someone else.',
    [
      ['You own', 'This one'],
      ['Price', formatPrice(candidate.price, currency)],
      ['Anything new', 'Nothing'],
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
  currency: CurrencyCode,
): Verdict {
  const { meaningful, newCount, realGains } = summarizeDelta(comparison);
  const price = candidate.price ?? 0;

  let kind: VerdictKind;
  let tag: string;
  let head: string;

  if (realGains <= 1) {
    kind = 'skip';
    tag = 'Skip it';
    head = realGains === 0 ? `Keep ${spendPhrase(price, currency)}.` : `Not worth ${spendPhrase(price, currency)}.`;
  } else if (realGains <= 3) {
    kind = 'wait';
    tag = 'Hold on';
    head = 'Only if you really want it.';
  } else {
    kind = 'buy';
    tag = 'Go for it';
    head = 'Yes. This one is worth it.';
  }

  const better =
    meaningful === 0
      ? 'Nothing important is clearly better'
      : meaningful === 1
        ? 'One thing is clearly better'
        : `${meaningful} things are clearly better`;
  const fresh =
    newCount === 0 ? '' : newCount === 1 ? ', and one thing is new' : `, and ${newCount} things are new`;
  const rationale =
    `You already have ${ownedItem.name}, since ${friendlySince(ownedItem.since)}. ` +
    `${better}${fresh}. Everything else barely changes.`;

  return buildVerdict(
    kind,
    tag,
    head,
    rationale,
    [
      ['Clearly better', String(realGains)],
      ['Price', formatPrice(candidate.price, currency)],
      ['Owned since', friendlySince(ownedItem.since) || '—'],
    ],
    candidate,
    ownedItem,
    comparison,
  );
}

/** Category overlap but model unknown: redundancy flag only */
function nameList(items: OwnedItem[]): string {
  const names = items.map((item) => item.name);
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function sameJob(candidateName: string, ownedName: string): boolean {
  const query = candidateName.toLowerCase();
  const owned = ownedName.toLowerCase();
  if (query === owned || query.includes(owned) || owned.includes(query)) return true;
  const words = owned.split(/\s+/).filter((word) => word.length > 3);
  return words.length > 0 && words.every((word) => query.includes(word));
}

function verdictOverlapUnknownModel(
  candidate: Candidate,
  ownedItems: OwnedItem[],
  cat: NonNullable<Candidate['cat']>,
  currency: CurrencyCode,
): Verdict {
  const ownedItem = ownedItems[0];
  const close = ownedItems.find((item) => sameJob(candidate.name, item.name)) ?? null;
  const remembered = nameList(ownedItems);
  const area = CATEGORY_AREA[cat];

  if (close) {
    return buildVerdict(
      'skip',
      'You already have it',
      `You already have ${close.name}.`,
      `It’s in your ${area} list, since ${friendlySince(close.since)}. ` +
        'Buying another one is the purchase you were hoping not to make.',
      [
        ['You already have', close.name],
        ['Area', area],
        ['Price', formatPrice(candidate.price, currency)],
      ],
      candidate,
      close,
      null,
    );
  }

  return buildVerdict(
    'wait',
    'Check what you own',
      `You already have ${remembered}.`,
    `That’s in ${area}. Only get this if it does something ${ownedItems.length > 1 ? 'those don’t' : 'that one doesn’t'}.`,
    [
      ['You already have', remembered],
      ['Area', area],
      ['Price', formatPrice(candidate.price, currency)],
    ],
    candidate,
    ownedItem,
    null,
  );
}

/** No category overlap: genuine gap */
function verdictNoOverlap(candidate: Candidate, cat: Candidate['cat'], currency: CurrencyCode): Verdict {
  const label = cat ? CATEGORY_LABEL[cat] : 'match';
  return buildVerdict(
    'clear',
    'New for you',
    'You don’t own anything like this.',
    cat
      ? `There’s no ${label} in your stuff yet. This isn’t a second one of something you have. It’s simply whether you want it.`
      : 'Nothing you own is close to this. It’s simply whether you want it.',
    [
      ['Overlap', 'None'],
      ['Price', formatPrice(candidate.price, currency)],
      ['A duplicate?', 'No'],
    ],
    candidate,
    null,
    null,
  );
}

export interface BuildVerdictInput {
  candidate: Candidate;
  ownedItem: OwnedItem | null;
  ownedInCategory?: OwnedItem[];
  matched: boolean;
  exactDuplicate: boolean;
  currency?: CurrencyCode;
}

export function buildVerdictFromContext(input: BuildVerdictInput): Verdict {
  const { candidate, ownedItem, matched, exactDuplicate } = input;
  const currency = input.currency ?? 'EUR';
  const inCategory = input.ownedInCategory ?? (ownedItem ? [ownedItem] : []);

  if (exactDuplicate && ownedItem) {
    return verdictDuplicate(candidate, ownedItem, currency);
  }

  if (matched && ownedItem && candidate.specs) {
    const comparison = compareSpecs(ownedItem, candidate.specs);
    return verdictUpgrade(candidate, ownedItem, comparison, currency);
  }

  if (ownedItem && candidate.cat) {
    return verdictOverlapUnknownModel(
      candidate,
      inCategory.length ? inCategory : [ownedItem],
      candidate.cat,
      currency,
    );
  }

  return verdictNoOverlap(candidate, candidate.cat, currency);
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
