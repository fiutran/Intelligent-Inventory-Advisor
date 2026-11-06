import { useCallback, useState } from 'react';
import type { Verdict } from './core/types.js';
import { AddScreen } from './app/components/AddScreen';
import { DecideScreen } from './app/components/DecideScreen';
import { ModelPicker, type ModelChoice } from './app/components/ModelPicker';
import { api } from './app/api/client';
import { InventoryScreen } from './app/components/InventoryScreen';
import { TabBar } from './app/components/TabBar';
import { Toast } from './app/components/Toast';
import { VerdictScreen } from './app/components/VerdictScreen';
import type { TabId } from './app/constants';

import { CURRENCIES, formatMoney } from './core/currency';
import { useAppState } from './app/hooks/useAppState';
import { useCurrency } from './app/hooks/useCurrency';
import { useTheme } from './app/hooks/useTheme';
import { useToast } from './app/hooks/useToast';

export default function App() {
  const {
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
  } = useAppState();
  const { currency, setCurrency } = useCurrency();
  const { toggle: toggleTheme } = useTheme();
  const toast = useToast();

  const [tab, setTab] = useState<TabId>('decide');
  const [showVerdict, setShowVerdict] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'models' | 'check' | null>(null);
  const [choices, setChoices] = useState<ModelChoice[] | null>(null);

  const serverHint = 'The app isn’t running. Double-click START.bat, then refresh.';

  const weigh = useCallback(
    async (raw?: string, picked = false) => {
      const q = (raw ?? query).trim();
      if (!q) {
        toast.show('Type the thing you’re tempted by');
        return;
      }
      if (raw) setQuery(raw);
      setBusy(true);
      setPhase(picked ? 'check' : 'models');
      try {
        let target = q;
        if (!picked) {
          const suggestion = await api.suggest(q, currency);
          if (suggestion.choose && suggestion.models.length > 1) {
            setChoices(suggestion.models);
            setPhase(null);
            setBusy(false);
            return;
          }
          if (suggestion.models[0]?.name) {
            target = suggestion.models[0].name;
            setQuery(target);
          }
        }
        setChoices(null);
        setPhase('check');
        const lookup = picked ? `${q} (${query})` : target;
        if (picked) setQuery(q);
        const result = await runDecide(lookup, null, currency);
        setVerdict(result.verdict);
        setShowVerdict(true);
      } catch {
        toast.show(serverHint);
      } finally {
        setBusy(false);
        setPhase(null);
      }
    },
    [query, currency, runDecide, toast],
  );

  const justLog = useCallback(() => {
    const q = query.trim();
    if (!q) {
      toast.show('Type an item first');
      return;
    }
    void (async () => {
      try {
        await logConsidering(q);
        toast.show(`Saved. “${q}” is on your mind.`);
        setTab('inv');
      } catch {
        toast.show(serverHint);
      }
    })();
  }, [query, logConsidering, toast]);

  const handleSkip = useCallback(() => {
    if (!verdict) return;
    void (async () => {
      try {
        await logSkip();
        toast.show(
          verdict.candidate.price
            ? `You passed. That’s ${formatMoney(verdict.candidate.price, currency)} still yours.`
            : 'You passed. The money stays yours.',
        );
        setShowVerdict(false);
        setTab('inv');
      } catch {
        toast.show('Could not save decision');
      }
    })();
  }, [verdict, currency, logSkip, toast]);

  const handleBuy = useCallback(() => {
    if (!verdict) return;
    void (async () => {
      try {
        const result = await logBuy(verdict);
        if (result.suggestSell && result.retiredName) {
          toast.show(
            `${verdict.candidate.name} is yours. Your old ${result.retiredName} might be worth selling.`,
          );
        } else if (result.retiredName) {
          toast.show(`${verdict.candidate.name} is in. ${result.retiredName} steps aside.`);
        } else {
          toast.show(`${verdict.candidate.name} is now in your stuff.`);
        }
        setShowVerdict(false);
        setTab('inv');
      } catch {
        toast.show('Could not save decision');
      }
    })();
  }, [verdict, logBuy, toast]);

  const handleManualAdd = useCallback(
    (input: { name: string; category: string; price: number | null; summary: string }) => {
      void (async () => {
        try {
          await addItem(input);
          toast.show(`${input.name} is on your list.`);
          setTab('inv');
        } catch {
          toast.show('Could not save item');
        }
      })();
    },
    [addItem, toast],
  );

  const handleRemove = useCallback(
    (itemId: number) => {
      void (async () => {
        try {
          await removeItem(itemId);
          toast.show('Taken off your list.');
        } catch {
          toast.show('Could not remove');
        }
      })();
    },
    [removeItem, toast],
  );

  const weighConsidering = useCallback(
    (name: string) => {
      setTab('decide');
      setShowVerdict(false);
      void weigh(name);
    },
    [weigh],
  );

  const handleReset = useCallback(() => {
    if (!confirm('Clear all inventory and decisions on this PC? This cannot be undone.')) return;
    void (async () => {
      try {
        await resetData();
        toast.show('Clean slate. What’s first?');
      } catch {
        toast.show('Could not clear data');
      }
    })();
  }, [resetData, toast]);

  const selectTab = (t: TabId) => {
    setTab(t);
    setShowVerdict(false);
    setChoices(null);
  };

  if (loading) {
    return (
      <div className="stage">
        <div className="glow glow-a" />
        <div className="glow glow-b" />
        <p className="caption">Getting your list ready…</p>
      </div>
    );
  }

  if (offline) {
    return (
      <div className="stage">
        <div className="glow glow-a" />
        <div className="glow glow-b" />
        <header className="top">
          <Brand />
        </header>
        <p className="caption">
          This page can’t reach the app on your computer. Double-click <b>START.bat</b>, then refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="stage">
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <header className="top">
        <Brand />
        <div className="top-actions">
          <label className="sr" htmlFor="currency">
            Currency
          </label>
          <select
            id="currency"
            className="currency"
            value={currency}
            aria-label="Currency"
            onChange={(event) => setCurrency(event.target.value as typeof currency)}
          >
            {CURRENCIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} {item.symbol}
              </option>
            ))}
          </select>
          <button type="button" className="themebtn" aria-label="Switch light or dark" onClick={toggleTheme}>
            <span aria-hidden="true">◐</span>
          </button>
        </div>
      </header>

      <div className="panel">
        {showVerdict && verdict ? (
          <VerdictScreen
            verdict={verdict}
            currency={currency}
            onSkip={handleSkip}
            onBuy={handleBuy}
            onBack={() => setShowVerdict(false)}
          />
        ) : tab === 'decide' ? (
          <DecideScreen
            query={query}
            busy={busy}
            onQueryChange={setQuery}
            onWeigh={() => void weigh()}
            onTry={(name) => void weigh(name)}
            busyLabel={phase === 'models' ? 'Finding models…' : 'Checking…'}
            onJustLog={justLog}
            owned={owned.map((item) => ({ name: item.name, icon: item.icon }))}
          />
        ) : tab === 'inv' ? (
          <InventoryScreen
            owned={owned}
            considering={considering}
            retired={retired}
            onRemove={handleRemove}
            onWeighConsidering={weighConsidering}
            onReset={handleReset}
          />
        ) : (
          <AddScreen currency={currency} onSave={handleManualAdd} />
        )}

        {choices ? (
          <ModelPicker
            query={query}
            models={choices}
            currency={currency}
            busy={busy}
            onClose={() => setChoices(null)}
            onPick={(name) => void weigh(name, true)}
          />
        ) : null}

        <TabBar active={showVerdict ? null : tab} onSelect={selectTab} />
        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M6 12.5l4 4 8-9" />
        </svg>
      </span>
      <div>
        <strong>Intelligent Inventory Advisor</strong>
        <span>A second opinion before you buy</span>
      </div>
    </div>
  );
}
