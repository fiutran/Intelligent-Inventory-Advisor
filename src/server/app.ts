import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { decide } from '../core/index.js';
import type { Verdict } from '../core/types.js';
import { CATEGORY_IDS } from '../db/map.js';
import type { AppDatabase } from './db.js';
import { completeDecision, saveDecideResult } from './decisions.js';
import {
  addConsidering,
  addDemoCharger,
  listOwnedInventory,
} from './inventory.js';

const DEFAULT_USER = 1;

export function createApp(db: AppDatabase) {
  const app = new Hono();

  app.use(
    '/api/*',
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    }),
  );

  app.get('/api/health', (c) => c.json({ ok: true }));

  app.get('/api/inventory', (c) => {
    const userId = Number(c.req.query('user_id') ?? DEFAULT_USER);
    const items = listOwnedInventory(db, userId);
    return c.json({ items });
  });

  app.post('/api/decide', async (c) => {
    const body = await c.req.json<{ query: string; price?: number | null; user_id?: number }>();
    const userId = body.user_id ?? DEFAULT_USER;
    const query = body.query?.trim();
    if (!query) return c.json({ error: 'query is required' }, 400);

    const inventory = listOwnedInventory(db, userId);
    const result = await decide({ query, price: body.price ?? null }, { inventory });

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
    const { retiredName, addedName } = completeDecision(
      db,
      decisionId,
      userId,
      body.outcome,
      againstAdvice,
    );

    return c.json({ ok: true, retiredName, addedName });
  });

  app.post('/api/inventory/considering', async (c) => {
    const body = await c.req.json<{ query: string; user_id?: number; category?: string }>();
    const userId = body.user_id ?? DEFAULT_USER;
    const query = body.query?.trim();
    if (!query) return c.json({ error: 'query is required' }, 400);

    const cat = body.category && body.category in CATEGORY_IDS ? body.category : 'phone';
    addConsidering(db, userId, query, CATEGORY_IDS[cat as keyof typeof CATEGORY_IDS]);

    return c.json({ ok: true });
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
    return c.json({ ok: true, items: listOwnedInventory(db, userId) });
  });

  return app;
}
