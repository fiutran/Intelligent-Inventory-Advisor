import type { ClassifyResult, OwnedItem, Verdict } from '../../core/types.js';

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

export const api = {
  health: () => request<{ ok: boolean }>('/health'),

  getInventory: () => request<{ items: OwnedItem[] }>('/inventory'),

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
    request<{ ok: boolean; retiredName: string | null; addedName: string | null }>(
      `/decisions/${decisionId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ outcome, bought_against_advice: boughtAgainstAdvice }),
      },
    ),

  logConsidering: (query: string) =>
    request<{ ok: boolean }>('/inventory/considering', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  addDemoCharger: () =>
    request<{ ok: boolean; items: OwnedItem[] }>('/inventory/demo-charger', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};
