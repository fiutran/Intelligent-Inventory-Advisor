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

const CATEGORIES: Category[] = [
  'phone',
  'earbuds',
  'headphones',
  'charger',
  'camera',
  'tablet',
  'laptop',
  'watch',
  'tv',
  'speaker',
];

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

async function chatJson<T>(system: string, user: string): Promise<T> {
  const cfg = readLlmConfig();
  if (!cfg) throw new Error('LLM is not configured');

  const payload: Record<string, unknown> = {
    model: cfg.model,
    temperature: 0.2,
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
  const q = query.toLowerCase();
  if (/phone|iphone|galaxy|pixel|samsung|xiaomi|oneplus/.test(q)) return 'phone';
  if (/airpod|earbud|buds/.test(q)) return 'earbuds';
  if (/headphone|xm5|xm4/.test(q)) return 'headphones';
  if (/charger|gan|watt/.test(q)) return 'charger';
  if (/camera|sony α|a7|a6400/.test(q)) return 'camera';
  if (/ipad|tablet/.test(q)) return 'tablet';
  if (/macbook|laptop/.test(q)) return 'laptop';
  if (/watch/.test(q)) return 'watch';
  if (/\btv\b/.test(q)) return 'tv';
  if (/speaker|soundbar/.test(q)) return 'speaker';
  return null;
}

/**
 * Improve the verdict copy (and optionally kind) using the rule-based draft + delta table.
 */
export async function refineVerdict(input: {
  candidate: Candidate;
  ownedItem: OwnedItem | null;
  comparison: DeltaRow[] | null;
  draft: Pick<Verdict, 'kind' | 'tag' | 'head' | 'rationale'>;
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
Be concise, concrete, and honest. Prefer keeping money unless gains are clear.
kind must be one of: skip, wait, buy, clear.
"clear" = new category / no overlap. "skip" = not worth it. "wait" = borderline. "buy" = worth it.
Return JSON only.`,
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
      `\n\nReturn: { "kind": "...", "tag": "Verdict · ...", "head": "one short line", "rationale": "2-3 sentences" }`,
  );

  const kind = kinds.includes(raw.kind as VerdictKind) ? (raw.kind as VerdictKind) : input.draft.kind;
  const head = (raw.head ?? '').trim() || input.draft.head;
  const rationale = (raw.rationale ?? '').trim() || input.draft.rationale;
  const tag = (raw.tag ?? '').trim() || input.draft.tag;
  return { kind, tag, head, rationale };
}
