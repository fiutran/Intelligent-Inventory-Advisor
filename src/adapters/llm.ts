import { guessCategory } from '../core/classifier.js';
import { normalizeSpecs, schemaPromptLines } from '../core/specs.js';
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

const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 20000);

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
    // Never let a slow model hang the Decide screen.
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
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

/** Shape check only; key mapping and ordering is done by core normalizeSpecs. */
function parseRawSpecs(raw: unknown, cat: Category): Spec[] {
  if (!Array.isArray(raw)) return [];
  const rows: Spec[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const k = typeof r.k === 'string' ? r.k.trim() : '';
    const v = typeof r.v === 'string' ? r.v.trim() : typeof r.v === 'number' ? String(r.v) : '';
    if (k && v) rows.push({ k, v });
  }
  return normalizeSpecs(rows, cat).slice(0, 12);
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
    specs?: Array<{ k?: string; v?: string }>;
    aliases?: string[];
    unknown?: boolean;
  };

  const raw = await chatJson<Raw>(
    `You are a product researcher for an upgrade-advisor app.
Return JSON only. Use typical retail Euro street price estimates when exact is unknown.
Categories must be one of: ${CATEGORIES.join(', ')}.
Specs are rows { "k": "key", "v": "value with unit" }. Use EXACTLY these keys for the category, in this format:
${schemaPromptLines()}
Only include a spec if you are confident of its official value. Omit it otherwise; a missing spec is shown as "no data", a wrong one misleads the user.
If the product does not have a feature (e.g. no telephoto lens), give "None".
Name the exact model the query refers to. Do not substitute a nearby model (a "Pro Max" query is not the "Pro").
Set "unknown": true if the text is not a real, released product you have reliable data for.`,
    `Research this product for upgrade comparison: "${query}"

Return:
{
  "name": "canonical product name",
  "cat": "phone",
  "meta": "short variant e.g. 256 GB",
  "price_eur": 999,
  "aliases": ["optional search aliases"],
  "specs": [{"k":"Chip","v":"Snapdragon 8 Elite"},{"k":"Battery","v":"30 h video"}],
  "unknown": false
}`,
  );

  if (raw.unknown === true) return null;

  const cat = asCategory(raw.cat) ?? guessCategory(query);
  if (!cat) return null;
  const name = (raw.name ?? query).trim();
  if (!name) return null;

  const specs = parseRawSpecs(raw.specs, cat);
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

/**
 * Reword the verdict explanation. The verdict itself (kind) is fixed by the rules and
 * is returned unchanged, so the AI can never contradict the comparison table.
 */
export async function refineVerdict(input: {
  candidate: Candidate;
  ownedItem: OwnedItem | null;
  comparison: DeltaRow[] | null;
  draft: Pick<Verdict, 'kind' | 'tag' | 'head' | 'rationale'>;
}): Promise<{ kind: VerdictKind; tag: string; head: string; rationale: string } | null> {
  type Raw = {
    head?: string;
    rationale?: string;
  };

  const raw = await chatJson<Raw>(
    `You rewrite the explanation for a purchase verdict so it reads naturally.
The verdict ("kind") is already decided. Do not argue with it or soften it.
Only mention specs that appear in the comparison; never add facts or numbers of your own.
"head" is one short sentence. "rationale" is 2-3 plain sentences a non-technical person understands.
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
        comparison: (input.comparison ?? [])
          .filter((r) => r.kind !== 'unknown')
          .map((r) => ({ spec: r.k, yours: r.own, considering: r.cand, result: r.label || 'Same' })),
        verdict: input.draft,
      },
      null,
      2,
    ) +
      `\n\nReturn: { "head": "one short line", "rationale": "2-3 sentences" }`,
  );

  const kind = input.draft.kind;
  const head = (raw.head ?? '').trim() || input.draft.head;
  const rationale = (raw.rationale ?? '').trim() || input.draft.rationale;
  const tag = input.draft.tag;
  return { kind, tag, head, rationale };
}
