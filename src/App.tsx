import { useCallback, useState } from 'react';
import type { Verdict } from './core/types.js';
import { AddScreen } from './app/components/AddScreen';
import { DecideScreen } from './app/components/DecideScreen';
import { InventoryScreen } from './app/components/InventoryScreen';
import { TabBar } from './app/components/TabBar';
import { Toast } from './app/components/Toast';
import { VerdictScreen } from './app/components/VerdictScreen';
import type { TabId } from './app/constants';
import { useAppState } from './app/hooks/useAppState';
import { useTheme } from './app/hooks/useTheme';
import { useToast } from './app/hooks/useToast';

const TAB_TITLE: Record<TabId, string> = {
  decide: 'Decide',
  inv: 'Inventory',
  add: 'Add',
};

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
  const { toggle: toggleTheme } = useTheme();
  const toast = useToast();

  const [tab, setTab] = useState<TabId>('decide');
  const [showVerdict, setShowVerdict] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [query, setQuery] = useState('');

  const serverHint = 'Start the app with START.bat or npm run host';

  const weigh = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      toast.show('Type what you’re thinking of buying');
      return;
    }
    try {
      const result = await runDecide(q, null);
      setVerdict(result.verdict);
      setShowVerdict(true);
    } catch {
      toast.show(serverHint);
    }
  }, [query, runDecide, toast]);

  const justLog = useCallback(() => {
    const q = query.trim();
    if (!q) {
      toast.show('Type an item first');
      return;
    }
    void (async () => {
      try {
        await logConsidering(q);
        toast.show(`Saved “${q}” under Thinking about`);
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
          `Logged “skipped” · kept ${verdict.candidate.price ? `€${verdict.candidate.price}` : 'the money'}`,
        );
        setShowVerdict(false);
        setTab('inv');
      } catch {
        toast.show('Could not save decision');
      }
    })();
  }, [verdict, logSkip, toast]);

  const handleBuy = useCallback(() => {
    if (!verdict) return;
    void (async () => {
      try {
        const result = await logBuy(verdict);
        if (result.suggestSell && result.retiredName) {
          toast.show(
            `Filed ${verdict.candidate.name}. Consider selling your old ${result.retiredName}.`,
          );
        } else if (result.retiredName) {
          toast.show(`Filed ${verdict.candidate.name} · replaced ${result.retiredName}`);
        } else {
          toast.show(`Filed ${verdict.candidate.name} to inventory`);
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
          toast.show(`Saved ${input.name}`);
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
          toast.show('Removed');
        } catch {
          toast.show('Could not remove');
        }
      })();
    },
    [removeItem, toast],
  );

  const weighConsidering = useCallback(
    (name: string) => {
      setQuery(name);
      setTab('decide');
      void (async () => {
        try {
          const result = await runDecide(name, null);
          setVerdict(result.verdict);
          setShowVerdict(true);
        } catch {
          toast.show(serverHint);
        }
      })();
    },
    [runDecide, toast],
  );

  const handleReset = useCallback(() => {
    if (!confirm('Clear all inventory and decisions on this PC? This cannot be undone.')) return;
    void (async () => {
      try {
        await resetData();
        toast.show('Cleared. Starting fresh');
      } catch {
        toast.show('Could not clear data');
      }
    })();
  }, [resetData, toast]);

  const selectTab = (t: TabId) => {
    setTab(t);
    setShowVerdict(false);
  };

  const title = showVerdict ? 'Decide' : TAB_TITLE[tab];
  const showCtx = false;

  if (loading) {
    return (
      <div className="wrap">
        <p className="caption">Loading…</p>
      </div>
    );
  }

  if (offline) {
    return (
      <div className="wrap">
        <div className="brandline">
          <span className="mark" />
          <span>
            <b>Inventory Delta Advisor</b>
          </span>
        </div>
        <p className="caption" style={{ maxWidth: 360 }}>
          Can&apos;t reach the local server. On this PC, double-click <b>START.bat</b> (or run{' '}
          <b>npm run host</b>), then refresh this page.
        </p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="brandline">
        <span className="mark" />
        <span>
          <b>Inventory Delta Advisor</b> · runs on this PC
        </span>
      </div>

      <div className="phone">
        <div className="appbar">
          <div>
            <h1>{title}</h1>
            {showCtx && (
              <div className="ctx">
                <span className="pin" />
                Before you buy, check it against what you own
              </div>
            )}
          </div>
          <button type="button" className="themebtn" aria-label="Toggle theme" onClick={toggleTheme}>
            ◐
          </button>
        </div>

        {showVerdict && verdict ? (
          <VerdictScreen
            verdict={verdict}
            onSkip={handleSkip}
            onBuy={handleBuy}
            onBack={() => setShowVerdict(false)}
          />
        ) : tab === 'decide' ? (
          <DecideScreen
            query={query}
            onQueryChange={setQuery}
            onWeigh={() => void weigh()}
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
          <AddScreen onSave={handleManualAdd} />
        )}

        <TabBar active={showVerdict ? null : tab} onSelect={selectTab} />
        <Toast message={toast.message} visible={toast.visible} />
      </div>

      <p className="caption">
        Type what you might buy. The app checks it against what you own and gives you a verdict.
      </p>
    </div>
  );
}
