import { SEED_OWNED } from '../data/seed.js';
import type { AppState, Candidate, OwnedItem, Preferences, Verdict } from '../core/types.js';

const STORAGE_KEY = 'intelligent-inventory-advisor-state';
const LEGACY_STORAGE_KEY = 'upgrade-skip-state';

function defaultPreferences(): Preferences {
  return {
    upgradeAppetite: {},
    recentDecisions: [],
  };
}

export function createInitialState(): AppState {
  return {
    inventory: structuredClone(SEED_OWNED),
    preferences: defaultPreferences(),
    specCache: {},
  };
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') {
    return createInitialState();
  }
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (!raw) return createInitialState();
    return JSON.parse(raw) as AppState;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export interface RecordDecisionInput {
  verdict: Verdict;
  outcome: 'skip' | 'buy';
  boughtAgainstAdvice?: boolean;
}

/**
 * Log a decision and optionally update inventory.
 * Returns updated state.
 */
export function recordDecision(state: AppState, input: RecordDecisionInput): AppState {
  const { verdict, outcome, boughtAgainstAdvice = false } = input;
  const next: AppState = {
    ...state,
    inventory: [...state.inventory],
    preferences: {
      ...state.preferences,
      recentDecisions: [...state.preferences.recentDecisions],
    },
  };

  next.preferences.recentDecisions.unshift({
    item: verdict.candidate.name,
    outcome,
    at: new Date().toISOString(),
  });
  next.preferences.recentDecisions = next.preferences.recentDecisions.slice(0, 50);

  if (outcome !== 'buy') return next;

  const c = verdict.candidate;
  if (!c.cat) return next;

  const newItem: OwnedItem = {
    cat: c.cat,
    icon: c.icon,
    name: c.name,
    paid: c.price ?? 0,
    since: 'today',
    prov: 'receipt',
    meta: c.meta,
    specs: c.specs ?? [],
  };

  const retire = next.inventory.find(
    (o: OwnedItem) => o.cat === newItem.cat && o.name !== newItem.name,
  );

  if (retire) {
    next.inventory = next.inventory.filter((o: OwnedItem) => o.name !== retire.name);
  }

  next.inventory.unshift(newItem);

  if (boughtAgainstAdvice && verdict.ownedItem && (verdict.kind === 'skip' || verdict.kind === 'wait')) {
    // Flag retained on verdict for UI: state tracks that we should nudge sell
    next.preferences.upgradeAppetite[newItem.cat] = 'eager';
  }

  return next;
}

export function addToConsidering(_state: AppState, _name: string): AppState {
  // v0: no-op placeholder for "just log considering"
  return _state;
}

export function cacheSpecs(
  state: AppState,
  productName: string,
  specs: Candidate['specs'],
): AppState {
  if (!specs) return state;
  return {
    ...state,
    specCache: { ...state.specCache, [productName]: specs },
  };
}
