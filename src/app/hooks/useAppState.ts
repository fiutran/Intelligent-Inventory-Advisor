import { useCallback, useEffect, useState } from 'react';
import type { OwnedItem, Verdict } from '../../core/types.js';
import { api } from '../api/client.js';

export function useAppState() {
  const [inventory, setInventory] = useState<OwnedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionId, setDecisionId] = useState<number | null>(null);

  const refreshInventory = useCallback(async () => {
    const { items } = await api.getInventory();
    setInventory(items);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await api.health();
        await refreshInventory();
      } catch (e) {
        console.error('API unavailable:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshInventory]);

  const runDecide = useCallback(async (query: string, price: number | null) => {
    const result = await api.decide(query, price);
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
      if (decisionId == null) return { retiredName: null as string | null };
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
      await api.logConsidering(query);
      await refreshInventory();
    },
    [refreshInventory],
  );

  const confirmAddDemo = useCallback(async () => {
    await api.addDemoCharger();
    await refreshInventory();
  }, [refreshInventory]);

  return {
    inventory,
    loading,
    runDecide,
    logSkip,
    logBuy,
    logConsidering,
    confirmAddDemo,
  };
}
