import type { ClassifyResult, InventoryListItem, OwnedItem, Verdict } from '../../core/types.js';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface DecideResponse {
  decision_id: number;
  verdict: Verdict;
  classify: ClassifyResult;
}

export interface InventoryResponse {
  items: InventoryListItem[];
  owned: InventoryListItem[];
  considering: InventoryListItem[];
  retired: InventoryListItem[];
}

export interface CatalogItemSummary {
  name: string;
  cat: string;
  icon: string;
  price: number | null;
  meta: string;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),

  getCatalog: (q?: string) =>
    request<{ items: CatalogItemSummary[] }>(
      q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog',
    ),

  getInventory: () => request<InventoryResponse>('/inventory'),

  decide: (query: string, price: number | null) =>
    request<DecideResponse>('/decide', {
      method: 'POST',
      body: JSON.stringify({ query, price }),
    }),

  completeDecision: (
    decisionId: number,
    outcome: 'skip' | 'buy',
    boughtAgainstAdvice: boolean,
  ) =>
    request<{
      ok: boolean;
      retiredName: string | null;
      addedName: string | null;
      suggestSell: boolean;
    }>(`/decisions/${decisionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ outcome, bought_against_advice: boughtAgainstAdvice }),
    }),

  logConsidering: (query: string) =>
    request<InventoryResponse>('/inventory/considering', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  addItem: (input: {
    name: string;
    category?: string;
    price?: number | null;
    summary?: string | null;
  }) =>
    request<InventoryResponse>('/inventory', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  removeItem: (itemId: number) =>
    request<InventoryResponse>(`/inventory/${itemId}`, { method: 'DELETE' }),

  addDemoCharger: () =>
    request<InventoryResponse>('/inventory/demo-charger', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  resetData: () =>
    request<InventoryResponse>('/inventory/reset', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};

export type { OwnedItem, InventoryListItem };
