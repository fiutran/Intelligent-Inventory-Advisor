import { useCallback, useEffect, useState } from 'react';
import type { InventoryListItem, Verdict } from '../../core/types.js';
import { api } from '../api/client.js';

export function useAppState() {
  const [owned, setOwned] = useState<InventoryListItem[]>([]);
  const [considering, setConsidering] = useState<InventoryListItem[]>([]);
  const [retired, setRetired] = useState<InventoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [decisionId, setDecisionId] = useState<number | null>(null);

  const applyInventory = useCallback((data: {
    items?: InventoryListItem[];
    owned?: InventoryListItem[];
    considering?: InventoryListItem[];
    retired?: InventoryListItem[];
  }) => {
    const items = data.items ?? [];
    setOwned(data.owned ?? items.filter((i) => i.status === 'owned'));
    setConsidering(data.considering ?? items.filter((i) => i.status === 'considering'));
    setRetired(data.retired ?? items.filter((i) => i.status === 'retired'));
  }, []);

  const refreshInventory = useCallback(async () => {
    const data = await api.getInventory();
    applyInventory(data);
  }, [applyInventory]);

  useEffect(() => {
    void (async () => {
      try {
        await api.health();
        await refreshInventory();
        setOffline(false);
      } catch (e) {
        console.error('API unavailable:', e);
        setOffline(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshInventory]);

  const runDecide = useCallback(async (query: string, price: number | null, currency: string) => {
    const result = await api.decide(query, price, currency);
    setDecisionId(result.decision_id);
    return result;
  }, []);

  const logSkip = useCallback(async () => {
    if (decisionId == null) return;
    await api.completeDecision(decisionId, 'skip', false);
    setDecisionId(null);
    await refreshInventory();
  }, [decisionId, refreshInventory]);

  const logBuy = useCallback(
    async (verdict: Verdict) => {
      if (decisionId == null) {
        return { retiredName: null as string | null, suggestSell: false };
      }
      const againstAdvice = verdict.kind === 'skip' || verdict.kind === 'wait';
      const result = await api.completeDecision(decisionId, 'buy', againstAdvice);
      setDecisionId(null);
      await refreshInventory();
      return result;
    },
    [decisionId, refreshInventory],
  );

  const logConsidering = useCallback(
    async (query: string) => {
      const data = await api.logConsidering(query);
      applyInventory(data);
    },
    [applyInventory],
  );

  const addItem = useCallback(
    async (input: { name: string; category?: string; price?: number | null; summary?: string }) => {
      const data = await api.addItem(input);
      applyInventory(data);
    },
    [applyInventory],
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      const data = await api.removeItem(itemId);
      applyInventory(data);
    },
    [applyInventory],
  );

  const resetData = useCallback(async () => {
    const data = await api.resetData();
    applyInventory(data);
  }, [applyInventory]);

  return {
    owned,
    considering,
    retired,
    loading,
    offline,
    runDecide,
    logSkip,
    logBuy,
    logConsidering,
    addItem,
    removeItem,
    resetData,
  };
}
