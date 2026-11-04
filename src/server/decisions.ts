import type { Category, ClassifyResult, Verdict } from '../core/types.js';
import { sameProduct } from '../core/match.js';
import { normalizeSpecs } from '../core/specs.js';
import { findCatalogItem } from '../data/seed.js';
import { CATEGORY_IDS, categoryNameById, verdictToNewDecision } from '../db/map.js';
import type { DecisionPayload, NewDecisionRow } from '../db/types.js';
import type { AppDatabase } from './db.js';
import { addInventoryItem, findOwnedInCategory, removeConsideringByName, retireItem } from './inventory.js';

function parsePayload(raw: string): DecisionPayload {
  return JSON.parse(raw) as DecisionPayload;
}

export function payloadToVerdict(
  payload: DecisionPayload,
  ownedItem: Verdict['ownedItem'],
): Verdict {
  return {
    kind: payload.kind,
    tag: payload.tag,
    head: payload.head,
    rationale: payload.rationale,
    meta: payload.meta,
    candidate: {
      name: payload.candidate.name,
      icon: payload.candidate.icon,
      cat: payload.candidate.cat,
      price: payload.candidate.price,
      meta: payload.candidate.meta,
      specs: null,
    },
    ownedItem,
    comparison: payload.comparison,
  };
}

export function insertDecision(db: AppDatabase, row: NewDecisionRow): number {
  const result = db
    .prepare(`
      INSERT INTO decision (
        user_id, category_id, query, branch, matched_item_id, verdict,
        stated_price, payload, bought_against_advice, retired_item_id,
        chosen_product_key, purchased
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      row.user_id,
      row.category_id,
      row.query,
      row.branch,
      row.matched_item_id,
      row.verdict,
      row.stated_price,
      JSON.stringify(row.payload),
      row.bought_against_advice ? 1 : 0,
      row.retired_item_id,
      row.chosen_product_key,
      row.purchased ? 1 : 0,
    );
  return Number(result.lastInsertRowid);
}

export function saveDecideResult(input: {
  db: AppDatabase;
  userId: number;
  query: string;
  statedPrice: number | null;
  verdict: Verdict;
  classify: ClassifyResult;
}): number {
  const { db, userId, verdict, classify } = input;

  const categoryId = verdict.candidate.cat ? CATEGORY_IDS[verdict.candidate.cat] : null;
  const owned = categoryId ? findOwnedInCategory(db, userId, categoryId) : null;

  const row = verdictToNewDecision({
    user_id: userId,
    query: input.query,
    stated_price: input.statedPrice,
    verdict,
    classify,
    purchased: false,
    matched_item_id: owned?.item_id ?? null,
  });

  return insertDecision(db, { ...row, purchased: false });
}

export function getDecision(db: AppDatabase, decisionId: number, userId: number) {
  const raw = db
    .prepare('SELECT * FROM decision WHERE decision_id = ? AND user_id = ?')
    .get(decisionId, userId) as Record<string, unknown> | undefined;
  if (!raw) return null;

  return {
    decision_id: raw.decision_id as number,
    payload: parsePayload(raw.payload as string),
    verdict_kind: raw.verdict as Verdict['kind'],
    category_id: raw.category_id as number | null,
    purchased: raw.purchased as number | null,
  };
}

export function completeDecision(
  db: AppDatabase,
  decisionId: number,
  userId: number,
  outcome: 'skip' | 'buy',
  boughtAgainstAdvice: boolean,
): { retiredName: string | null; addedName: string | null; suggestSell: boolean } {
  const dec = getDecision(db, decisionId, userId);
  if (!dec) throw new Error('Decision not found');

  const purchased = outcome === 'buy' ? 1 : 0;
  let retiredItemId: number | null = null;
  let retiredName: string | null = null;
  let addedName: string | null = null;
  let suggestSell = false;

  if (outcome === 'buy' && dec.category_id) {
    const owned = findOwnedInCategory(db, userId, dec.category_id);
    if (owned) {
      const ownedName = owned.brand ? `${owned.brand} ${owned.model}` : owned.model;
      if (sameProduct(ownedName, dec.payload.candidate.name)) {
        db.prepare(`
          UPDATE decision SET purchased = ?, bought_against_advice = ? WHERE decision_id = ?
        `).run(purchased, boughtAgainstAdvice ? 1 : 0, decisionId);
        removeConsideringByName(db, userId, dec.payload.candidate.name);
        return { retiredName: null, addedName: null, suggestSell: false };
      }
      retireItem(db, owned.item_id);
      retiredItemId = owned.item_id;
      retiredName = ownedName;
      suggestSell = boughtAgainstAdvice;
    }

    const cat = categoryNameById(dec.category_id);
    if (cat) {
      const parts = dec.payload.candidate.name.trim().split(/\s+/);
      const brand = parts.length >= 2 ? parts[0] : null;
      const model =
        parts.length >= 2 ? parts.slice(1).join(' ') : dec.payload.candidate.name;
      const hit = findCatalogItem(dec.payload.candidate.name);
      const specs = hit
        ? normalizeSpecs(hit.specs, cat as Category)
        : [];

      addInventoryItem(db, {
        user_id: userId,
        category_id: dec.category_id,
        brand,
        model,
        summary: dec.payload.candidate.meta,
        icon: dec.payload.candidate.icon,
        price: dec.payload.candidate.price,
        release_year: null,
        specs,
        provenance: 'receipt',
        confidence: hit ? 'high' : null,
        status: 'owned',
        acquired_at: new Date().toISOString().slice(0, 10),
      });
      addedName = dec.payload.candidate.name;
    }

    removeConsideringByName(db, userId, dec.payload.candidate.name);
  }

  db.prepare(`
    UPDATE decision SET
      purchased = ?,
      bought_against_advice = ?,
      retired_item_id = ?
    WHERE decision_id = ?
  `).run(purchased, boughtAgainstAdvice ? 1 : 0, retiredItemId, decisionId);

  return { retiredName, addedName, suggestSell };
}
