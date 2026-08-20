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
  const { inventory, loading, runDecide, logSkip, logBuy, logConsidering, confirmAddDemo } =
    useAppState();
  const { toggle: toggleTheme } = useTheme();
  const toast = useToast();

  const [tab, setTab] = useState<TabId>('decide');
  const [showVerdict, setShowVerdict] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [query, setQuery] = useState('');
  const [price, setPrice] = useState('');

  const parsePrice = (raw: string): number | null => {
    const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
    return Number.isNaN(n) ? null : n;
  };

  const weigh = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      toast.show('Type what you’re thinking of buying');
      return;
    }
    try {
      const result = await runDecide(q, parsePrice(price));
      setVerdict(result.verdict);
      setShowVerdict(true);
    } catch {
      toast.show('Could not reach the server — is npm run dev:api running?');
    }
  }, [query, price, runDecide, toast]);

  const pick = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      setPrice('');
      void (async () => {
        try {
          const result = await runDecide(suggestion, null);
          setVerdict(result.verdict);
          setShowVerdict(true);
        } catch {
          toast.show('Could not reach the server');
        }
      })();
    },
    [runDecide, toast],
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
        toast.show(`Logged — considering “${q}”`);
      } catch {
        toast.show('Could not reach the server');
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
        if (result?.retiredName) {
          toast.show(`Filed ${verdict.candidate.name} · retired the ${result.retiredName}`);
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

  const handleConfirmAdd = useCallback(() => {
    void (async () => {
      try {
        await confirmAddDemo();
        toast.show('Saved to inventory');
        setTab('inv');
      } catch {
        toast.show('Could not save item');
      }
    })();
  }, [confirmAddDemo, toast]);

  const selectTab = (t: TabId) => {
    setTab(t);
    setShowVerdict(false);
  };

  const title = showVerdict ? 'Decide' : TAB_TITLE[tab];
  const showCtx = tab === 'decide' && !showVerdict;

  if (loading) {
    return (
      <div className="wrap">
        <p className="caption">Loading…</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="brandline">
        <span className="mark" />
        <span>
          <b>Inventory Delta Advisor</b> · interactive prototype
        </span>
      </div>

      <div className="phone">
        <div className="statusbar">
          <span>9:41</span>
          <span className="dots">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="appbar">
          <div>
            <h1>{title}</h1>
            {showCtx && (
              <div className="ctx">
                <span className="pin" />
                Before you buy — check it against what you own
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
            price={price}
            onQueryChange={setQuery}
            onPriceChange={setPrice}
            onWeigh={() => void weigh()}
            onJustLog={justLog}
            onPick={pick}
          />
        ) : tab === 'inv' ? (
          <InventoryScreen items={inventory} />
        ) : (
          <AddScreen onConfirm={handleConfirmAdd} />
        )}

        <TabBar active={showVerdict ? null : tab} onSelect={selectTab} />
        <Toast message={toast.message} visible={toast.visible} />
      </div>

      <p className="caption">
        Type any item on the <b>Decide</b> tab. The engine looks for a match in your
        inventory, compares the specs it can, and returns a verdict you can log.
      </p>
    </div>
  );
}
