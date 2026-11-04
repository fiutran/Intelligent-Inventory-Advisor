/**
 * Spec schema: the single source of truth for what we compare, per category.
 *
 * Every spec says:
 *  - how to read its value (number, ordered ladder, chip generation, video mode, free text)
 *  - which direction is better (higher / lower / neither)
 *  - how much it matters to a buying decision (core vs minor)
 *  - how big a change has to be before a person would notice it (threshold)
 *
 * Catalog data, LLM research and legacy rows from old databases all pass through
 * `normalizeSpecs`, so the comparison engine only ever sees canonical keys.
 */
import type { Category, Spec, SpecWeight } from './types.js';

export type Better = 'higher' | 'lower' | 'none';
export type Importance = 'core' | 'minor';

interface BaseDef {
  /** Canonical key, also the row label in the UI. */
  key: string;
  /** Other names the same spec arrives under (LLM output, old data). Lower-case. */
  aliases?: string[];
  importance: Importance;
  /** Short noun used in verdict copy: "better zoom and battery life". */
  noun: string;
  /** For specs that read badly as nouns ("better weight"): adjectives used instead. */
  adj?: { better: string; worse: string };
  /** Example value, used in the LLM prompt so research comes back in our format. */
  example: string;
}

export interface NumberDef extends BaseDef {
  kind: 'number';
  better: Better;
  /** Relative change below which two values count as "about the same" (0.1 = 10%). */
  threshold: number;
  /** Values like "None", "-" or "2× crop" mean the feature is absent (= 0). */
  noneIsZero?: boolean;
}

export interface LadderDef extends BaseDef {
  kind: 'ladder';
  /** Ordered low → high. Each step lists synonyms (lower-case). */
  steps: string[][];
  /** Steps of difference that count as a major change (default 1). */
  majorAt?: number;
}

export interface ChipDef extends BaseDef {
  kind: 'chip';
}

export interface VideoDef extends BaseDef {
  kind: 'video';
}

export interface TextDef extends BaseDef {
  kind: 'text';
}

export type SpecDef = NumberDef | LadderDef | ChipDef | VideoDef | TextDef;

/* ---------- shared building blocks ---------- */

const chip = (importance: Importance = 'core'): ChipDef => ({
  key: 'Chip',
  kind: 'chip',
  importance,
  noun: 'chip',
  aliases: ['processor', 'chipset', 'soc', 'cpu'],
  example: 'A18 Pro',
});

const battery = (example: string, threshold = 0.1): NumberDef => ({
  key: 'Battery',
  kind: 'number',
  better: 'higher',
  threshold,
  importance: 'core',
  noun: 'battery life',
  aliases: ['battery video', 'battery life', 'video playback', 'battery (video)'],
  example,
});

const weight = (example: string): NumberDef => ({
  key: 'Weight',
  kind: 'number',
  better: 'lower',
  threshold: 0.08,
  importance: 'minor',
  noun: 'weight',
  adj: { better: 'lighter', worse: 'heavier' },
  aliases: ['mass'],
  example,
});

const screen = (example: string): NumberDef => ({
  key: 'Screen',
  kind: 'number',
  better: 'none',
  threshold: 0.03,
  importance: 'minor',
  noun: 'screen size',
  aliases: ['screen size', 'display size', 'size'],
  example,
});

const refresh = (importance: Importance = 'minor'): NumberDef => ({
  key: 'Refresh rate',
  kind: 'number',
  better: 'higher',
  threshold: 0.2,
  importance,
  noun: 'refresh rate',
  aliases: ['refresh', 'hz'],
  example: '120 Hz',
});

const port: LadderDef = {
  key: 'Port',
  kind: 'ladder',
  importance: 'minor',
  noun: 'port',
  aliases: ['connector', 'usb port', 'charging port', 'case'],
  steps: [['micro usb', 'microusb'], ['lightning'], ['usb c', 'usbc', 'type c', 'thunderbolt']],
  example: 'USB-C',
};

/* ---------- per-category schemas (order = display order) ---------- */

export const SPEC_SCHEMA: Record<Category, SpecDef[]> = {
  phone: [
    chip(),
    {
      key: 'Tele zoom',
      kind: 'number',
      better: 'higher',
      threshold: 0.2,
      importance: 'core',
      noun: 'zoom',
      noneIsZero: true,
      aliases: ['zoom', 'telephoto', 'optical zoom'],
      example: '5× (or "None")',
    },
    battery('27 h video'),
    {
      key: 'Main camera',
      kind: 'number',
      better: 'higher',
      threshold: 0.2,
      importance: 'minor',
      noun: 'main camera',
      aliases: ['camera', 'rear camera', 'wide camera'],
      example: '48 MP',
    },
    refresh(),
    screen('6.3″'),
    port,
    weight('199 g'),
  ],
  earbuds: [
    chip(),
    {
      key: 'ANC',
      kind: 'ladder',
      importance: 'core',
      noun: 'noise cancelling',
      aliases: ['noise cancelling', 'noise cancellation', 'active noise cancellation'],
      steps: [['none', 'no'], ['yes', 'basic', 'standard', '1st gen'], ['adaptive', '2nd gen']],
      majorAt: 2,
      example: 'Adaptive',
    },
    battery('6 h'),
    port,
  ],
  headphones: [
    {
      key: 'ANC',
      kind: 'ladder',
      importance: 'core',
      noun: 'noise cancelling',
      aliases: ['noise cancelling', 'noise cancellation'],
      steps: [['none', 'no'], ['yes', 'basic', 'standard'], ['adaptive', 'advanced']],
      majorAt: 2,
      example: 'Adaptive',
    },
    battery('30 h', 0.15),
    port,
    weight('250 g'),
  ],
  charger: [
    {
      key: 'Power',
      kind: 'number',
      better: 'higher',
      threshold: 0.15,
      importance: 'core',
      noun: 'power',
      aliases: ['wattage', 'output'],
      example: '100 W',
    },
    {
      key: 'Ports',
      kind: 'number',
      better: 'higher',
      threshold: 0.01,
      importance: 'core',
      noun: 'number of ports',
      aliases: ['port count', 'outputs'],
      example: '3',
    },
    {
      key: 'Tech',
      kind: 'ladder',
      importance: 'minor',
      noun: 'charger tech',
      aliases: ['technology'],
      steps: [['silicon', 'standard'], ['gan']],
      example: 'GaN',
    },
    weight('180 g'),
  ],
  camera: [
    {
      key: 'Sensor',
      kind: 'ladder',
      importance: 'core',
      noun: 'sensor size',
      aliases: ['sensor size', 'format'],
      steps: [
        ['1 inch', '1in'],
        ['micro four thirds', 'mft', 'm43'],
        ['aps c', 'apsc'],
        ['full frame', 'fullframe', 'ff'],
        ['medium format'],
      ],
      example: 'Full-frame',
    },
    {
      key: 'Video',
      kind: 'video',
      importance: 'core',
      noun: 'video',
      aliases: ['video resolution', 'max video'],
      example: '4K60',
    },
    {
      key: 'Resolution',
      kind: 'number',
      better: 'higher',
      threshold: 0.15,
      importance: 'minor',
      noun: 'resolution',
      aliases: ['megapixels', 'mp'],
      example: '33 MP',
    },
    weight('658 g'),
  ],
  tablet: [chip(), battery('10 h'), refresh(), screen('11″'), port, weight('462 g')],
  laptop: [
    chip(),
    {
      key: 'RAM',
      kind: 'number',
      better: 'higher',
      threshold: 0.2,
      importance: 'core',
      noun: 'memory',
      aliases: ['memory', 'unified memory'],
      example: '16 GB',
    },
    battery('18 h'),
    refresh(),
    screen('13.6″'),
    weight('1.24 kg'),
  ],
  watch: [chip(), battery('18 h', 0.15), screen('45 mm')],
  tv: [
    {
      key: 'Panel',
      kind: 'ladder',
      importance: 'core',
      noun: 'panel',
      aliases: ['panel type', 'display type'],
      steps: [['lcd', 'led'], ['qled'], ['mini led', 'miniled'], ['oled', 'qd oled']],
      example: 'OLED',
    },
    {
      key: 'Resolution',
      kind: 'ladder',
      importance: 'core',
      noun: 'resolution',
      steps: [['hd', '720p'], ['full hd', '1080p', 'fhd'], ['4k', 'uhd'], ['8k']],
      example: '4K',
    },
    refresh('core'),
    { ...screen('65″'), threshold: 0.05 },
  ],
  speaker: [
    {
      key: 'Power',
      kind: 'number',
      better: 'higher',
      threshold: 0.2,
      importance: 'core',
      noun: 'loudness',
      aliases: ['output', 'wattage'],
      example: '30 W',
    },
    battery('12 h', 0.15),
    weight('540 g'),
  ],
};

/* ---------- key normalisation ---------- */

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function findDef(cat: Category, key: string): SpecDef | undefined {
  const k = norm(key);
  return SPEC_SCHEMA[cat].find(
    (d) => norm(d.key) === k || (d.aliases ?? []).some((a) => norm(a) === k),
  );
}

function weightOf(def: SpecDef | undefined): SpecWeight {
  return def?.importance === 'core' ? 'high' : 'low';
}

/** Split a legacy compound display row ("6.1″ 120 Hz") into Screen + Refresh rate. */
function splitDisplay(cat: Category, value: string): Spec[] {
  const out: Spec[] = [];
  const inches = value.match(/(\d+(?:\.\d+)?)\s*(″|"|-?inch|in\b)/i);
  const hz = value.match(/(\d+)\s*hz/i);
  if (inches && findDef(cat, 'Screen')) out.push({ k: 'Screen', v: `${inches[1]}″` });
  if (hz && findDef(cat, 'Refresh rate')) out.push({ k: 'Refresh rate', v: `${hz[1]} Hz` });
  return out;
}

/**
 * Map any spec rows (catalog, LLM, legacy DB) onto the category's canonical keys,
 * de-duplicate, order them like the schema, and tag each with its weight.
 * Unknown keys are kept (shown, never scored).
 */
export function normalizeSpecs(specs: Spec[], cat: Category): Spec[] {
  const byKey = new Map<string, Spec>();
  const extras: Spec[] = [];

  const push = (s: Spec) => {
    const def = findDef(cat, s.k);
    if (def) {
      if (!byKey.has(def.key)) byKey.set(def.key, { k: def.key, v: s.v, w: weightOf(def) });
    } else if (!extras.some((e) => norm(e.k) === norm(s.k))) {
      extras.push({ k: s.k, v: s.v, w: 'low' });
    }
  };

  for (const raw of specs) {
    const k = (raw.k ?? '').trim();
    const v = (raw.v ?? '').trim();
    if (!k || !v) continue;
    if (!findDef(cat, k) && /^(display|screen)$/i.test(k)) {
      const parts = splitDisplay(cat, v);
      if (parts.length) {
        parts.forEach(push);
        continue;
      }
    }
    push({ k, v });
  }

  const ordered = SPEC_SCHEMA[cat]
    .map((d) => byKey.get(d.key))
    .filter((s): s is Spec => s !== undefined);
  return [...ordered, ...extras];
}

/** One line per category for the LLM prompt: exact keys + example values. */
export function schemaPromptLines(): string {
  return (Object.keys(SPEC_SCHEMA) as Category[])
    .map((cat) => `${cat}: ${SPEC_SCHEMA[cat].map((d) => `"${d.key}" (e.g. ${d.example})`).join(', ')}`)
    .join('\n');
}
