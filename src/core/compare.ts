/**
 * Spec-by-spec comparison with direction.
 *
 * Each row answers: is the thing you're considering better, worse, about the same,
 * or just different from what you own, and does the change matter?
 * Missing data is reported as missing. It is never counted as a gain.
 */
import { findDef, normalizeSpecs, SPEC_SCHEMA } from './specs.js';
import type { ChipDef, LadderDef, NumberDef, SpecDef, VideoDef } from './specs.js';
import type { Category, DeltaKind, DeltaRow, Significance, Spec } from './types.js';

/* ---------- value parsing ---------- */

const NONE_RE = /^(none|no|n\/a|-|—|–)$/i;

export function parseNumber(value: string, def: Pick<NumberDef, 'noneIsZero'>): number | null {
  const v = value.trim();
  if (def.noneIsZero && (NONE_RE.test(v) || /crop|digital/i.test(v))) return 0;
  const m = v.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let n = Number(m[1]);
  // weights given in kg vs g
  if (/\bkg\b/i.test(v)) n *= 1000;
  return Number.isFinite(n) ? n : null;
}

function normWords(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

export function ladderIndex(value: string, def: Pick<LadderDef, 'steps'>): number | null {
  const v = normWords(value);
  let found: number | null = null;
  def.steps.forEach((synonyms, i) => {
    if (synonyms.some((s) => v.includes(normWords(s)))) found = i;
  });
  return found;
}

export interface ChipInfo {
  family: string;
  score: number;
  /** Score difference that equals one product generation. */
  step: number;
}

/** Place a chip on a per-family generation scale. Cross-family chips are not comparable. */
export function parseChip(value: string): ChipInfo | null {
  const v = value.toLowerCase();
  let m: RegExpMatchArray | null;

  if ((m = v.match(/\ba(\d{2})\b(?:\s*bionic)?(\s*pro)?/))) {
    return { family: 'apple-a', score: Number(m[1]) + (m[2] ? 0.5 : 0), step: 1 };
  }
  if ((m = v.match(/\bm(\d)\b(\s*(pro|max|ultra))?/))) {
    const tier = { pro: 1, max: 1.5, ultra: 2 }[m[3] as 'pro' | 'max' | 'ultra'] ?? 0;
    return { family: 'apple-m', score: Number(m[1]) + tier, step: 1 };
  }
  if ((m = v.match(/snapdragon\s*(\d)\s*(\+)?\s*(?:gen\s*(\d)|(elite))/))) {
    const gen = m[4] ? 4 : Number(m[3]) + (m[2] ? 0.5 : 0);
    return { family: 'snapdragon', score: Number(m[1]) * 10 + gen, step: 1 };
  }
  if ((m = v.match(/tensor\s*g(\d)/))) return { family: 'tensor', score: Number(m[1]), step: 1 };
  if ((m = v.match(/exynos\s*(\d{4})/))) return { family: 'exynos', score: Number(m[1]) / 100, step: 1 };
  if ((m = v.match(/dimensity\s*(\d{4})/))) return { family: 'dimensity', score: Number(m[1]) / 100, step: 1 };
  if ((m = v.match(/\bh(\d)\b/))) return { family: 'apple-h', score: Number(m[1]), step: 1 };
  if ((m = v.match(/\bs(\d{1,2})\b/))) return { family: 'apple-s', score: Number(m[1]), step: 1 };
  return null;
}

interface VideoMode {
  k: number;
  fps: number;
}

export function parseVideo(value: string): VideoMode | null {
  const v = value.toLowerCase().replace(/\s+/g, '');
  const k = v.match(/(\d+(?:\.\d+)?)k/);
  const p = v.match(/(\d{3,4})p/);
  const res = k ? Number(k[1]) : p ? Number(p[1]) / 540 : null; // 1080p ≈ 2K
  if (res == null) return null;
  const fps = v.match(/(?:k|p)(\d{2,3})/);
  return { k: res, fps: fps ? Number(fps[1]) : 30 };
}

/* ---------- row comparison ---------- */

interface Outcome {
  kind: DeltaKind;
  significance?: Significance;
  /** For better:'none' numbers, e.g. "Bigger" / "Smaller". */
  note?: string;
}

function textOutcome(a: string, b: string): Outcome {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
    ? { kind: 'same' }
    : { kind: 'different' };
}

function compareNumber(def: NumberDef, a: string, b: string): Outcome {
  const x = parseNumber(a, def);
  const y = parseNumber(b, def);
  if (x == null || y == null) return textOutcome(a, b);
  if (x === y) return { kind: 'same' };

  const base = Math.max(Math.min(Math.abs(x), Math.abs(y)), 1e-9);
  const rel = x === 0 || y === 0 ? Infinity : Math.abs(y - x) / base;
  if (rel < def.threshold) return { kind: 'similar' };

  if (def.better === 'none') {
    const note = def.key === 'Screen' ? (y > x ? 'Bigger' : 'Smaller') : y > x ? 'Higher' : 'Lower';
    return { kind: 'different', note };
  }
  const improved = def.better === 'higher' ? y > x : y < x;
  const significance: Significance = rel >= def.threshold * 3 ? 'major' : 'minor';
  return { kind: improved ? 'better' : 'worse', significance };
}

function compareLadder(def: LadderDef, a: string, b: string): Outcome {
  const x = ladderIndex(a, def);
  const y = ladderIndex(b, def);
  if (x == null || y == null) return textOutcome(a, b);
  if (x === y) return { kind: 'same' };
  const significance: Significance = Math.abs(y - x) >= (def.majorAt ?? 1) ? 'major' : 'minor';
  return { kind: y > x ? 'better' : 'worse', significance };
}

function compareChip(_def: ChipDef, a: string, b: string): Outcome {
  const x = parseChip(a);
  const y = parseChip(b);
  if (!x || !y) return textOutcome(a, b);
  if (x.family !== y.family) return { kind: 'different', note: 'Different chip' };
  const gens = (y.score - x.score) / x.step;
  if (gens === 0) return { kind: 'same' };
  if (Math.abs(gens) < 0.5) return { kind: 'similar' };
  const significance: Significance = Math.abs(gens) >= 2 ? 'major' : 'minor';
  return { kind: gens > 0 ? 'better' : 'worse', significance };
}

function compareVideo(_def: VideoDef, a: string, b: string): Outcome {
  const x = parseVideo(a);
  const y = parseVideo(b);
  if (!x || !y) return textOutcome(a, b);
  if (x.k === y.k && x.fps === y.fps) return { kind: 'same' };
  if (x.k !== y.k) return { kind: y.k > x.k ? 'better' : 'worse', significance: 'major' };
  return { kind: y.fps > x.fps ? 'better' : 'worse', significance: 'minor' };
}

function compareValue(def: SpecDef | undefined, a: string, b: string): Outcome {
  if (!def) return textOutcome(a, b);
  switch (def.kind) {
    case 'number':
      return compareNumber(def, a, b);
    case 'ladder':
      return compareLadder(def, a, b);
    case 'chip':
      return compareChip(def, a, b);
    case 'video':
      return compareVideo(def, a, b);
    default:
      return textOutcome(a, b);
  }
}

/* ---------- scoring ---------- */

const IMPORTANCE_POINTS = { core: 2, minor: 1 } as const;
const SIGNIFICANCE_FACTOR = { major: 1, minor: 0.5 } as const;

function pillLabel(o: Outcome): string {
  switch (o.kind) {
    case 'better':
      return o.significance === 'major' ? 'Much better' : 'Better';
    case 'worse':
      return o.significance === 'major' ? 'Much worse' : 'Worse';
    case 'similar':
      return 'About the same';
    case 'different':
      return o.note ?? 'Different';
    case 'unknown':
      return 'No data';
    default:
      return '';
  }
}

/**
 * Compare the owned item's specs with the candidate's, in schema order.
 * Specs present on only one side are shown as "No data", not as gains or losses.
 */
export function compareSpecs(cat: Category, ownedSpecs: Spec[], candidateSpecs: Spec[]): DeltaRow[] {
  const own = normalizeSpecs(ownedSpecs, cat);
  const cand = normalizeSpecs(candidateSpecs, cat);
  const ownMap = new Map(own.map((s) => [s.k, s.v]));
  const candMap = new Map(cand.map((s) => [s.k, s.v]));

  const schemaKeys = SPEC_SCHEMA[cat].map((d) => d.key);
  const extraKeys = cand
    .map((s) => s.k)
    .filter((k) => !schemaKeys.includes(k) && ownMap.has(k));
  const keys = [...schemaKeys.filter((k) => ownMap.has(k) || candMap.has(k)), ...extraKeys];

  return keys.map((k): DeltaRow => {
    const def = findDef(cat, k);
    const a = ownMap.get(k);
    const b = candMap.get(k);
    const outcome: Outcome = a == null || b == null ? { kind: 'unknown' } : compareValue(def, a, b);
    const importance = def?.importance ?? 'minor';
    const sign = outcome.kind === 'better' ? 1 : outcome.kind === 'worse' ? -1 : 0;
    const points = sign
      ? sign * IMPORTANCE_POINTS[importance] * SIGNIFICANCE_FACTOR[outcome.significance ?? 'minor']
      : 0;
    return {
      k,
      own: a ?? '-',
      cand: b ?? '-',
      kind: outcome.kind,
      label: pillLabel(outcome),
      significance: outcome.significance,
      importance,
      noun: def?.noun ?? k.toLowerCase(),
      adj:
        def?.adj && (outcome.kind === 'better' || outcome.kind === 'worse')
          ? def.adj[outcome.kind]
          : undefined,
      points,
    };
  });
}

export interface ComparisonSummary {
  gains: DeltaRow[];
  losses: DeltaRow[];
  gainPoints: number;
  lossPoints: number;
  net: number;
  /** Rows where both sides had comparable data. */
  comparable: number;
  /** Losses on specs that matter, by a noticeable margin. */
  majorCoreLosses: DeltaRow[];
}

export function summarize(rows: DeltaRow[]): ComparisonSummary {
  const byImpact = (a: DeltaRow, b: DeltaRow) => Math.abs(b.points) - Math.abs(a.points);
  const gains = rows.filter((r) => r.kind === 'better').sort(byImpact);
  const losses = rows.filter((r) => r.kind === 'worse').sort(byImpact);
  const gainPoints = gains.reduce((s, r) => s + r.points, 0);
  const lossPoints = -losses.reduce((s, r) => s + r.points, 0);
  return {
    gains,
    losses,
    gainPoints,
    lossPoints,
    net: gainPoints - lossPoints,
    comparable: rows.filter((r) => ['better', 'worse', 'same', 'similar'].includes(r.kind)).length,
    majorCoreLosses: losses.filter((r) => r.importance === 'core' && r.significance === 'major'),
  };
}
