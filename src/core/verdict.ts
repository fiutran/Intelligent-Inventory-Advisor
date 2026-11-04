/**
 * Verdict rules. Deliberately simple and explainable, every verdict can be traced
 * to rows in the comparison table:
 *
 *   net = points gained − points lost
 *   (core spec = 2 pts, minor spec = 1 pt; a minor-sized change is worth half)
 *
 *   net ≤ 0              → skip   "a step down" / "basically the same"
 *   0 < net < 2          → skip   "barely an upgrade"
 *   2 ≤ net < 5          → wait   "a modest upgrade"
 *   net ≥ 5              → buy    (wait if it costs you a core spec by a wide margin)
 *   net ≥ 3, owned ≥ 3 y → buy    (old devices get a lower bar)
 *   < 2 comparable specs → wait   "not enough data to judge" (we never guess)
 */
import { CATEGORY_LABEL } from '../data/seed.js';
import { compareSpecs, summarize } from './compare.js';
import type { ComparisonSummary } from './compare.js';
import type { Candidate, DeltaRow, OwnedItem, Verdict, VerdictKind } from './types.js';

export const THRESHOLDS = { worthIt: 5, modest: 2, oldDeviceYears: 3, oldDeviceWorthIt: 3 } as const;

function formatPrice(price: number | null): string {
  return price ? `€${price.toLocaleString('en-US')}` : '-';
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Parse "2024-03-01", "Sep 2022", "~ Mar 2024" or "2021". */
export function parseSince(since: string): Date | null {
  const s = since.trim().toLowerCase();
  let m = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3] ?? 1));
  m = s.match(/([a-z]{3})[a-z]*\.?\s+(\d{4})/);
  if (m && MONTHS.includes(m[1])) return new Date(Number(m[2]), MONTHS.indexOf(m[1]), 1);
  m = s.match(/\b(19|20)\d{2}\b/);
  if (m) return new Date(Number(m[0]), 0, 1);
  return null;
}

export function ageInYears(since: string, now: Date = new Date()): number | null {
  const d = parseSince(since);
  if (!d) return null;
  return (now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
}

/** ", owned since Sep 2022," for mid-sentence use; empty when we don't know. */
function sinceClause(owned: OwnedItem): string {
  const d = parseSince(owned.since);
  if (!d) return '';
  return `, owned since ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()},`;
}

function listJoin(words: string[]): string {
  const uniq = [...new Set(words)];
  if (uniq.length <= 1) return uniq[0] ?? '';
  return `${uniq.slice(0, -1).join(', ')} and ${uniq[uniq.length - 1]}`;
}

/** Noun list for rows that read as nouns ("chip, zoom and battery life"). */
function nouns(rows: DeltaRow[], max = 3): string {
  return listJoin(rows.filter((r) => !r.adj).slice(0, max).map((r) => r.noun));
}

/** "It's also lighter." / "It's heavier, though." for adjective-style specs. */
function adjNote(gains: DeltaRow[], losses: DeltaRow[]): string {
  const up = listJoin(gains.filter((r) => r.adj).map((r) => r.adj!));
  const down = listJoin(losses.filter((r) => r.adj).map((r) => r.adj!));
  return (up ? ` It's also ${up}.` : '') + (down ? ` It's ${down}, though.` : '');
}

/** "It's worse on chip and zoom, and heavier" / "It's heavier". */
function worseOn(losses: DeltaRow[]): string {
  const n = nouns(losses);
  const a = listJoin(losses.filter((r) => r.adj).map((r) => r.adj!));
  if (!n) return `It's ${a}`;
  return `It's worse on ${n}${a ? `, and ${a}` : ''}`;
}

/** Headline-friendly: nouns if there are any, else the adjectives ("lighter"). */
function what(rows: DeltaRow[], max = 3): string {
  return nouns(rows, max) || listJoin(rows.map((r) => r.adj ?? r.noun));
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
    suggestSellExisting: false,
  };
}

/** Same model already owned. */
function verdictDuplicate(candidate: Candidate, ownedItem: OwnedItem): Verdict {
  return buildVerdict(
    'skip',
    'Verdict · you already own this',
    'You already own this exact model.',
    `Your ${ownedItem.name}${sinceClause(ownedItem) || ''} is already in your inventory. ` +
      'A second one only makes sense if the first is broken, lost or going to someone else.',
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

export interface UpgradeDecision {
  kind: VerdictKind;
  tag: string;
  head: string;
  rationale: string;
}

/** The scoring rules, separated from the Verdict wrapper so they can be tested directly. */
export function decideUpgrade(
  s: ComparisonSummary,
  owned: OwnedItem,
  candidate: Candidate,
  now: Date = new Date(),
): UpgradeDecision {
  const yours = `your ${owned.name}`;
  const age = ageInYears(owned.since, now);
  const old = age != null && age >= THRESHOLDS.oldDeviceYears;
  const price = formatPrice(candidate.price);
  const lossNouns = nouns(s.losses);
  const catch_ = (lossNouns ? ` The catch: it's worse on ${lossNouns}.` : '') + adjNote(s.gains, s.losses);

  if (s.comparable < 2) {
    return {
      kind: 'wait',
      tag: 'Verdict · not enough data',
      head: 'Not enough comparable specs to judge.',
      rationale:
        `We only have matching data for ${s.comparable} spec${s.comparable === 1 ? '' : 's'} on both ` +
        `${owned.name} and ${candidate.name}, so any verdict would be a guess.`,
    };
  }

  if (s.net <= 0) {
    if (s.lossPoints > s.gainPoints) {
      return {
        kind: 'skip',
        tag: 'Verdict · step down',
        head: `This is a step down from ${yours}.`,
        rationale:
          worseOn(s.losses) +
          (nouns(s.gains) ? `, and only better on ${nouns(s.gains)}.` : ', with nothing important in return.') +
          ` Keep ${price === '-' ? 'your money' : price}.`,
      };
    }
    return {
      kind: 'skip',
      tag: 'Verdict · no real difference',
      head: `Basically the same as ${yours}.`,
      rationale:
        (s.gains.length
          ? `Small wins on ${what(s.gains)} are cancelled out by worse ${what(s.losses)}. `
          : 'None of the specs that matter change in a way you would notice. ') +
        'Nothing here justifies a purchase.',
    };
  }

  if (s.net >= THRESHOLDS.worthIt || (old && s.net >= THRESHOLDS.oldDeviceWorthIt)) {
    if (s.majorCoreLosses.length && !old) {
      return {
        kind: 'wait',
        tag: 'Verdict · trade-off',
        head: `Better ${what(s.gains, 2)}, but worse ${what(s.majorCoreLosses, 2)}.`,
        rationale:
          `It's a real upgrade in ${what(s.gains)}, but a clear step back in ` +
          `${nouns(s.majorCoreLosses)}. Only buy it if that trade suits how you use ${yours}.`,
      };
    }
    return {
      kind: 'buy',
      tag: 'Verdict · worth it',
      head: `A real upgrade: better ${what(s.gains)}.`,
      rationale:
        (old
          ? `${capitalise(yours)} is about ${Math.floor(age!)} years old, and this improves the ${what(s.gains)}.`
          : `Clear gains in ${what(s.gains)} over ${yours}.`) + catch_,
    };
  }

  if (s.net >= THRESHOLDS.modest) {
    return {
      kind: 'wait',
      tag: 'Verdict · modest upgrade',
      head: `A modest upgrade: better ${what(s.gains, 2)}.`,
      rationale:
        `Worth it only if ${s.gains[0].noun} really matters to you. ` +
        `For everything else, ${yours} already does the job.` +
        catch_,
    };
  }

  return {
    kind: 'skip',
    tag: 'Verdict · skip for now',
    head: `Barely an upgrade over ${yours}.`,
    rationale:
      (nouns(s.gains)
        ? `Only the ${nouns(s.gains)} ${s.gains.filter((r) => !r.adj).length === 1 ? 'improves' : 'improve'}, and not by much. `
        : `It's a little ${what(s.gains)}, and nothing else improves. `) +
      `That's not worth ${price === '-' ? 'the money' : price}.` +
      catch_,
  };
}

/** Known model + owned item in the same category: full spec comparison. */
function verdictUpgrade(
  candidate: Candidate & { cat: NonNullable<Candidate['cat']>; specs: NonNullable<Candidate['specs']> },
  ownedItem: OwnedItem,
  now: Date,
): Verdict {
  const comparison = compareSpecs(candidate.cat, ownedItem.specs, candidate.specs);
  const s = summarize(comparison);
  const d = decideUpgrade(s, ownedItem, candidate, now);
  return buildVerdict(
    d.kind,
    d.tag,
    d.head,
    d.rationale,
    [
      ['Better', String(s.gains.length)],
      ['Worse', String(s.losses.length)],
      ['Price', formatPrice(candidate.price)],
    ],
    candidate,
    ownedItem,
    comparison,
  );
}

/** Category overlap but we don't know the exact model: flag the overlap, don't score. */
function verdictOverlapUnknownModel(
  candidate: Candidate,
  ownedItem: OwnedItem,
  cat: NonNullable<Candidate['cat']>,
): Verdict {
  return buildVerdict(
    'wait',
    'Verdict · overlap',
    `You already own a ${CATEGORY_LABEL[cat]}.`,
    `Your ${ownedItem.name}${sinceClause(ownedItem)} already covers this need. ` +
      "We don't have specs for this exact model, so we can flag the overlap but can't score the upgrade.",
    [
      ['Overlap', 'Same category'],
      ['Price', formatPrice(candidate.price)],
      ['Scored', 'No'],
    ],
    candidate,
    ownedItem,
    null,
  );
}

/** Nothing similar owned. */
function verdictNoOverlap(candidate: Candidate, cat: Candidate['cat']): Verdict {
  const what = cat ? `a ${CATEGORY_LABEL[cat]}` : 'anything like this';
  return buildVerdict(
    'clear',
    'Verdict · no overlap',
    'Nothing like it in your inventory.',
    `You don't own ${what}, so there's no duplication risk. ` +
      "Whether to buy it is a need-vs-want call, not an upgrade one.",
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
  now?: Date;
}

export function buildVerdictFromContext(input: BuildVerdictInput): Verdict {
  const { candidate, ownedItem, matched, exactDuplicate } = input;
  const now = input.now ?? new Date();

  if (exactDuplicate && ownedItem) return verdictDuplicate(candidate, ownedItem);

  if (matched && ownedItem && candidate.cat && candidate.specs?.length) {
    return verdictUpgrade({ ...candidate, cat: candidate.cat, specs: candidate.specs }, ownedItem, now);
  }

  if (ownedItem && candidate.cat) return verdictOverlapUnknownModel(candidate, ownedItem, candidate.cat);

  return verdictNoOverlap(candidate, candidate.cat);
}

/** When the person buys against a skip/wait verdict, suggest selling the existing item. */
export function shouldSuggestSell(verdict: Verdict, boughtAnyway: boolean): boolean {
  if (!boughtAnyway) return false;
  if (!verdict.ownedItem) return false;
  return verdict.kind === 'skip' || verdict.kind === 'wait';
}

export function withSellSuggestion(verdict: Verdict): Verdict {
  return { ...verdict, suggestSellExisting: true };
}
