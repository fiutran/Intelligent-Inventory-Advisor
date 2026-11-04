import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { isLlmConfigured, readLlmConfig, refineVerdict, researchProduct } from '../adapters/llm.js';
import { decide, guessCategory } from '../core/index.js';
import type { CatalogItem, OwnedItem, Verdict } from '../core/types.js';
import { normalizeSpecs } from '../core/specs.js';
import { findCatalogItem, SEED_CATALOG } from '../data/seed.js';
import { CATEGORY_IDS, CATEGORY_ICONS } from '../db/map.js';
import {
  findCachedProduct,
  persistOwnedSpecs,
  upsertResearchedProduct,
} from './catalog-cache.js';
import type { AppDatabase } from './db.js';
import { completeDecision, saveDecideResult } from './decisions.js';
import {
  addConsidering,
  addDemoCharger,
  addManualItem,
  clearUserData,
  deleteInventoryItem,
  listInventory,
} from './inventory.js';

const DEFAULT_USER = 1;

function inventoryPayload(db: AppDatabase, userId: number) {
  const items = listInventory(db, userId);
  return {
    items,
    owned: items.filter((i) => i.status === 'owned'),
    considering: items.filter((i) => i.status === 'considering'),
    retired: items.filter((i) => i.status === 'retired'),
  };
}

async function resolveProduct(db: AppDatabase, query: string): Promise<CatalogItem | null> {
  const seed = findCatalogItem(query);
  if (seed) return seed;

  const cached = findCachedProduct(db, query);
  if (cached && cached.specs.length > 0) return cached;

  if (!isLlmConfigured()) return cached;

  const researched = await researchProduct(query);
  if (!researched) return cached;
  return upsertResearchedProduct(db, researched, query);
}

/** Fill empty owned specs from cache/LLM so delta columns are fair. */
async function enrichOwnedForDecide(
  db: AppDatabase,
  userId: number,
): Promise<OwnedItem[]> {
  const items = listInventory(db, userId).filter((i) => i.status === 'owned');
  const out: OwnedItem[] = [];

  for (const item of items) {
    if (item.specs.length > 0) {
      const { item_id: _id, status: _s, ...rest } = item;
      out.push(rest);
      continue;
    }

    try {
      const product = await resolveProduct(db, item.name);
      if (product && product.specs.length > 0) {
        const specs = normalizeSpecs(product.specs, item.cat);
        persistOwnedSpecs(db, item.item_id, specs, product.meta, product.icon);
        out.push({
          cat: item.cat,
          icon: item.icon || product.icon,
          name: product.name || item.name,
          paid: item.paid,
          since: item.since,
          prov: item.prov,
          meta: item.meta || product.meta,
          specs,
        });
        continue;
      }
    } catch (err) {
      console.warn(
        '[decide] owned research failed:',
        item.name,
        err instanceof Error ? err.message : err,
      );
    }

    const { item_id: _id, status: _s, ...rest } = item;
    out.push(rest);
  }

  return out;
}

export interface CreateAppOptions {
  corsOrigins?: string[];
}

export function createApp(db: AppDatabase, options: CreateAppOptions = {}) {
  const app = new Hono();

  app.use(
    '/api/*',
    cors({
      origin: options.corsOrigins ?? [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
    }),
  );

  app.get('/api/health', (c) => {
    const cfg = readLlmConfig();
    return c.json({
      ok: true,
      llm: cfg
        ? { configured: true, model: cfg.model, baseUrl: cfg.baseUrl }
        : { configured: false },
    });
  });

  app.get('/api/catalog', (c) => {
    const q = (c.req.query('q') ?? '').trim().toLowerCase();
    const items = SEED_CATALOG.map((item) => ({
      name: item.name,
      cat: item.cat,
      icon: item.icon,
      price: item.price,
      meta: item.meta,
    }));
    const filtered = q
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.cat.toLowerCase().includes(q),
        )
      : items;
    return c.json({
      items: filtered,
      llm: isLlmConfigured(),
    });
  });

  app.get('/api/inventory', (c) => {
    const userId = Number(c.req.query('user_id') ?? DEFAULT_USER);
    return c.json(inventoryPayload(db, userId));
  });

  app.post('/api/inventory', async (c) => {
    const body = await c.req.json<{
      name: string;
      category?: string;
      price?: number | null;
      summary?: string | null;
      user_id?: number;
    }>();
    const userId = body.user_id ?? DEFAULT_USER;
    const name = body.name?.trim();
    if (!name) return c.json({ error: 'name is required' }, 400);

    const catName =
      body.category && body.category in CATEGORY_IDS
        ? body.category
        : guessCategory(name) ?? 'phone';
    const categoryId = CATEGORY_IDS[catName as keyof typeof CATEGORY_IDS];

    const itemId = addManualItem(db, {
      userId,
      categoryId,
      name,
      price: body.price ?? null,
      summary: body.summary ?? null,
    });

    // If Add didn't match the seed catalog, research once so Decide has specs later
    const items = listInventory(db, userId);
    const added = items.find((i) => i.item_id === itemId);
    if (added && added.specs.length === 0 && isLlmConfigured()) {
      try {
        const product = await resolveProduct(db, name);
        if (product?.specs.length) {
          persistOwnedSpecs(
            db,
            itemId,
            normalizeSpecs(product.specs, product.cat),
            product.meta,
            product.icon,
          );
        }
      } catch (err) {
        console.warn('[add] research failed:', err instanceof Error ? err.message : err);
      }
    }

    return c.json({ ok: true, ...inventoryPayload(db, userId) });
  });

  app.delete('/api/inventory/:id', (c) => {
    const userId = Number(c.req.query('user_id') ?? DEFAULT_USER);
    const itemId = Number(c.req.param('id'));
    const ok = deleteInventoryItem(db, userId, itemId);
    if (!ok) return c.json({ error: 'Item not found' }, 404);
    return c.json({ ok: true, ...inventoryPayload(db, userId) });
  });

  app.post('/api/decide', async (c) => {
    const body = await c.req.json<{ query: string; price?: number | null; user_id?: number }>();
    const userId = body.user_id ?? DEFAULT_USER;
    const query = body.query?.trim();
    if (!query) return c.json({ error: 'query is required' }, 400);

    const inventory = await enrichOwnedForDecide(db, userId);
    const llmOn = isLlmConfigured();

    const result = await decide(
      { query, price: body.price ?? null },
      {
        inventory,
        catalog: SEED_CATALOG,
        researchProduct: llmOn
          ? async (q) => resolveProduct(db, q)
          : async (q) => findCachedProduct(db, q) ?? findCatalogItem(q) ?? null,
        refineVerdict: llmOn
          ? async (input) => refineVerdict(input)
          : undefined,
      },
    );

    const decisionId = saveDecideResult({
      db,
      userId,
      query,
      statedPrice: body.price ?? null,
      verdict: result.verdict as Verdict,
      classify: result.classify,
    });

    return c.json({
      decision_id: decisionId,
      verdict: result.verdict,
      classify: result.classify,
      llm_used: llmOn && !result.classify.cacheHit,
    });
  });

  app.post('/api/decisions/:id/complete', async (c) => {
    const decisionId = Number(c.req.param('id'));
    const body = await c.req.json<{
      outcome: 'skip' | 'buy';
      bought_against_advice?: boolean;
      user_id?: number;
    }>();
    const userId = body.user_id ?? DEFAULT_USER;

    if (!body.outcome) return c.json({ error: 'outcome is required' }, 400);

    const againstAdvice = body.bought_against_advice ?? false;
    const result = completeDecision(db, decisionId, userId, body.outcome, againstAdvice);

    return c.json({ ok: true, ...result });
  });

  app.post('/api/inventory/considering', async (c) => {
    const body = await c.req.json<{ query: string; user_id?: number }>();
    const userId = body.user_id ?? DEFAULT_USER;
    const query = body.query?.trim();
    if (!query) return c.json({ error: 'query is required' }, 400);

    const cat = guessCategory(query) ?? 'phone';
    addConsidering(db, userId, query, CATEGORY_IDS[cat], CATEGORY_ICONS[cat]);

    return c.json({ ok: true, ...inventoryPayload(db, userId) });
  });

  app.post('/api/inventory/reset', async (c) => {
    let userId = DEFAULT_USER;
    try {
      const body = await c.req.json<{ user_id?: number }>();
      userId = body.user_id ?? DEFAULT_USER;
    } catch {
      // empty body ok
    }
    clearUserData(db, userId);
    return c.json({ ok: true, ...inventoryPayload(db, userId) });
  });

  app.post('/api/inventory/demo-charger', async (c) => {
    let userId = DEFAULT_USER;
    try {
      const body = await c.req.json<{ user_id?: number }>();
      userId = body.user_id ?? DEFAULT_USER;
    } catch {
      // empty body is fine
    }
    addDemoCharger(db, userId);
    return c.json({ ok: true, ...inventoryPayload(db, userId) });
  });

  return app;
}
