import { guessCategory } from '../core/classifier.js';
import { CATEGORY_WORDS } from '../data/seed.js';
import { CATEGORY_ICONS } from '../db/map.js';
import type {
  Candidate,
  Category,
  DeltaRow,
  OwnedItem,
  Spec,
  Verdict,
  VerdictKind,
} from '../core/types.js';

const CATEGORIES = Object.keys(CATEGORY_WORDS) as Category[];

export interface ResearchedProduct {
  name: string;
  cat: Category;
  meta: string;
  price: number | null;
  icon: string;
  specs: Spec[];
  aliases: string[];
}

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function readLlmConfig(): LlmConfig | null {
  const apiKey = (process.env.LLM_API_KEY ?? '').trim();
  const baseUrl = (process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = (process.env.LLM_MODEL ?? 'gpt-4o-mini').trim();
  // Ollama and some local servers accept any/empty key
  const allowEmptyKey = /localhost|127\.0\.0\.1/i.test(baseUrl);
  if (!apiKey && !allowEmptyKey) return null;
  return { apiKey: apiKey || 'ollama', baseUrl, model };
}

export function isLlmConfigured(): boolean {
  return readLlmConfig() !== null;
}

async function chatJson<T>(system: string, user: string, temperature = 0.2): Promise<T> {
  const cfg = readLlmConfig();
  if (!cfg) throw new Error('LLM is not configured');

  const payload: Record<string, unknown> = {
    model: cfg.model,
    temperature,
    messages: [
      { role: 'system', content: system + '\nAlways respond with a single JSON object, no markdown.' },
      { role: 'user', content: user },
    ],
  };

  // OpenAI / compatible APIs; some local models ignore this
  if (!/11434/.test(cfg.baseUrl)) {
    payload.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 240)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM returned empty content');

  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as T;
}

function asCategory(raw: unknown): Category | null {
  if (typeof raw !== 'string') return null;
  const c = raw.toLowerCase().trim() as Category;
  return CATEGORIES.includes(c) ? c : null;
}

function normalizeSpecs(raw: unknown, cat: Category): Spec[] {
  if (!Array.isArray(raw)) return [];
  const keyMap: Record<string, string> = {
    processor: 'Chip',
    chipset: 'Chip',
    soc: 'Chip',
    cpu: 'Chip',
    screen: 'Display',
    'rear camera': 'Main camera',
    camera: 'Main camera',
    'main camera': 'Main camera',
    zoom: 'Tele zoom',
    telephoto: 'Tele zoom',
    'tele zoom': 'Tele zoom',
    connector: 'Port',
    'usb port': 'Port',
    battery: 'Battery video',
    'battery life': 'Battery video',
    'video playback': 'Battery video',
    mass: 'Weight',
  };

  const out: Spec[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    let k = typeof r.k === 'string' ? r.k.trim() : '';
    let v = typeof r.v === 'string' ? r.v.trim() : '';
    if (!k || !v) continue;
    const mapped = keyMap[k.toLowerCase()];
    if (mapped) k = mapped;
    // If model stuffed extra detail into w, append when w isn't high/low
    if (typeof r.w === 'string' && r.w !== 'high' && r.w !== 'low' && r.w.trim()) {
      v = `${v} (${r.w.trim()})`;
    }
    const w = r.w === 'high' || r.w === 'low' ? r.w : undefined;
    out.push(w ? { k, v, w } : { k, v });
  }
  return out.slice(0, 12);
}

/**
 * Ask the LLM for a structured product card (name, category, comparable specs).
 * Used when the local catalog does not know the device.
 */
export async function researchProduct(query: string): Promise<ResearchedProduct | null> {
  type Raw = {
    name?: string;
    cat?: string;
    meta?: string;
    price_eur?: number | null;
    specs?: Array<{ k?: string; v?: string; w?: string }>;
    aliases?: string[];
    unknown?: boolean;
  };

  const phoneSpecHint =
    'For phones, prefer these exact keys when possible: Chip, Display, Main camera, Tele zoom, Port, Battery video, Weight.';

  const raw = await chatJson<Raw>(
    `You are a product researcher for an upgrade-advisor app.
Return JSON only. Use typical retail Euro street price estimates when exact is unknown.
Categories must be one of: ${CATEGORIES.join(', ')}.
Specs must be short comparable rows: { "k": "label", "v": "value", "w": "high"|"low" }.
w must be ONLY "high" or "low" (high = buying-decision specs like camera, chip, power, ANC, sensor, ports).
${phoneSpecHint}
IMPORTANT: If the query looks like a real product name or model (including rumored, upcoming, or newly announced devices), set "unknown": false and fill best-known or widely reported specs. Only set "unknown": true for gibberish or clearly non-product text.`,
    `Research this product for upgrade comparison: "${query}"

Return:
{
  "name": "canonical product name",
  "cat": "phone",
  "meta": "short variant e.g. 256 GB",
  "price_eur": 999,
  "aliases": ["optional search aliases"],
  "specs": [{"k":"Chip","v":"Snapdragon 8 Elite","w":"high"}],
  "unknown": false
}`,
  );

  // Only reject gibberish, never drop a named product just because it's new/rumored
  if (raw.unknown === true && !raw.name && !asCategory(raw.cat)) return null;

  const cat = asCategory(raw.cat) ?? guessCategoryFromQuery(query);
  if (!cat) return null;
  const name = (raw.name ?? query).trim();
  if (!name) return null;

  const specs = normalizeSpecs(raw.specs, cat);
  const price =
    typeof raw.price_eur === 'number' && Number.isFinite(raw.price_eur)
      ? Math.round(raw.price_eur)
      : null;

  return {
    name,
    cat,
    meta: (raw.meta ?? '').trim() || '',
    price,
    icon: CATEGORY_ICONS[cat],
    specs,
    aliases: Array.isArray(raw.aliases)
      ? raw.aliases.filter((a): a is string => typeof a === 'string').map((a) => a.toLowerCase())
      : [],
  };
}

function guessCategoryFromQuery(query: string): Category | null {
  return guessCategory(query);
}

export interface ModelSuggestion {
  name: string;
  meta: string;
  price: number | null;
}

/**
 * A brand or a range ("hammer earbuds") is not one product.
 * Return the real models a shopper might mean so they can pick one.
 */
function readModelRows(
  raw: { models?: Array<{ name?: string; meta?: string; price_eur?: number | null }> },
  query: string,
): ModelSuggestion[] {
  const seen = new Set<string>();
  const models: ModelSuggestion[] = [];
  const queryKey = query.trim().toLowerCase();
  for (const row of raw.models ?? []) {
    const name = row.name?.trim() ?? '';
    const key = name.toLowerCase();
    if (!name || key === queryKey || seen.has(key)) continue;
    if (/\b[a-z]\d{1,2}\b/i.test(name)) continue;
    seen.add(key);
    const price =
      typeof row.price_eur === 'number' && Number.isFinite(row.price_eur)
        ? Math.round(row.price_eur)
        : null;
    models.push({ name, meta: row.meta?.trim() ?? '', price });
    if (models.length === 8) break;
  }
  return models;
}

/** Phones a shopper can buy in November 2026. The model list often stops at the iPhone 15. */
const CURRENT_IPHONES: ModelSuggestion[] = [
  { name: 'iPhone 18 Pro', meta: '6.3″, A20 Pro, 256 GB', price: 1299 },
  { name: 'iPhone 18 Pro Max', meta: '6.9″, A20 Pro, 256 GB', price: 1449 },
  { name: 'iPhone Duo', meta: 'Foldable, 7.6″ open, A20 Pro', price: 2199 },
];

function isBroadIphoneQuery(query: string): boolean {
  const q = query.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return q === 'iphone' || q === 'iphones' || q === 'appleiphone';
}

function iphoneGeneration(name: string): number | null {
  const match = name.match(/iphone\s*(\d{2})\b/i);
  return match ? Number(match[1]) : null;
}

function preferCurrentPhones(query: string, models: ModelSuggestion[]): ModelSuggestion[] {
  if (!isBroadIphoneQuery(query)) return models;
  const merged = [...CURRENT_IPHONES];
  for (const model of models) {
    const generation = iphoneGeneration(model.name);
    if (generation != null && generation < 16) continue;
    const key = model.name.toLowerCase();
    if (merged.some((item) => item.name.toLowerCase() === key)) continue;
    merged.push(model);
  }
  return merged.slice(0, 8);
}

export async function suggestModels(query: string): Promise<ModelSuggestion[]> {
  type Raw = {
    models?: Array<{ name?: string; meta?: string; price_eur?: number | null }>;
  };

  const ask = (extra: string) =>
    chatJson<Raw>(
      `You list real electronics a shopper can buy on 6 November 2026. Return JSON only. Prices are typical Euro street prices.
Rules:
- Newest models currently on sale come first. Do not fill the list with phones from 2023 or 2024 when a 2025 or 2026 model exists.
- For a plain "iPhone" search, include iPhone 18 Pro, iPhone 18 Pro Max, and iPhone Duo, then iPhone 17 models still sold. Do not return iPhone 14 or iPhone 15.
- Use the manufacturer's real model name. Never invent codes such as H1, X1, X5, Model A, or Series 1.
- A made-up name like "Hammer X1" must not appear. Real names look like "Hammer Airflow Neo", "iPhone 18 Pro", or "Sony WH-1000XM5".
- If you are not sure a model exists, leave it out.
- If the query is already one specific model, return that one model only.
- If the query is a brand or a range, return the distinct real models a person might mean.
- meta is a short real difference: size, chip, battery, noise cancelling, or price tier.
${extra}`,
      `Query: "${query}"

Return:
{
  "models": [
    { "name": "Exact Model Name", "meta": "ANC, 30 h", "price_eur": 49 }
  ]
}`,
      0,
    );

  const first = preferCurrentPhones(query, readModelRows(await ask(''), query));
  if (first.length > 1) return first;
  return preferCurrentPhones(
    query,
    readModelRows(await ask('The previous try was empty or used fake codes. Return real sold models only.'), query),
  );
}

/**
 * Improve the verdict copy (and optionally kind) using the rule-based draft + delta table.
 */
export async function refineVerdict(input: {
  candidate: Candidate;
  ownedItem: OwnedItem | null;
  comparison: DeltaRow[] | null;
  draft: Pick<Verdict, 'kind' | 'tag' | 'head' | 'rationale'>;
  currency?: string;
}): Promise<{ kind: VerdictKind; tag: string; head: string; rationale: string } | null> {
  type Raw = {
    kind?: string;
    tag?: string;
    head?: string;
    rationale?: string;
  };

  const kinds: VerdictKind[] = ['skip', 'wait', 'buy', 'clear'];
  const raw = await chatJson<Raw>(
    `You advise people whether an upgrade is worth buying vs what they already own.
Write like a sharp friend, not a spec sheet. Short sentences. Honest. Prefer keeping money unless the gains are obvious.
kind must be one of: skip, wait, buy, clear.
"clear" = they don't own this kind of thing. "skip" = not worth it. "wait" = only if they really want it. "buy" = worth it.
Do not change kind. Return JSON only.
Prices are already in ${input.currency ?? 'EUR'}. If you mention a price, keep that number and that currency. Do not convert it.`,
    JSON.stringify(
      {
        candidate: {
          name: input.candidate.name,
          price: input.candidate.price,
          meta: input.candidate.meta,
          cat: input.candidate.cat,
        },
        owned: input.ownedItem
          ? {
              name: input.ownedItem.name,
              since: input.ownedItem.since,
              paid: input.ownedItem.paid,
              specs: input.ownedItem.specs,
            }
          : null,
        comparison: input.comparison,
        rule_based_draft: input.draft,
      },
      null,
      2,
    ) +
      `\n\nReturn: { "kind": "...", "tag": "Skip it | Hold on | Go for it | New for you", "head": "one short spoken line", "rationale": "2 short sentences a person would actually say" }`,
  );

  const kind = kinds.includes(raw.kind as VerdictKind) ? (raw.kind as VerdictKind) : input.draft.kind;
  const head = (raw.head ?? '').trim() || input.draft.head;
  const rationale = (raw.rationale ?? '').trim() || input.draft.rationale;
  const tag = (raw.tag ?? '').trim() || input.draft.tag;
  return { kind, tag, head, rationale };
}
