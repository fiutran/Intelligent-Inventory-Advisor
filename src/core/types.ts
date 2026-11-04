export type Category =
  | 'phone'
  | 'earbuds'
  | 'headphones'
  | 'charger'
  | 'camera'
  | 'tablet'
  | 'laptop'
  | 'watch'
  | 'tv'
  | 'speaker';

export type SpecWeight = 'high' | 'low';

export interface Spec {
  k: string;
  v: string;
  w?: SpecWeight;
}

export type Provenance = 'receipt' | 'photo' | 'manual';

export interface OwnedItem {
  cat: Category;
  icon: string;
  name: string;
  paid: number;
  since: string;
  prov: Provenance;
  meta: string;
  specs: Spec[];
}

/** Inventory row as shown in the UI (includes DB id + status) */
export interface InventoryListItem extends OwnedItem {
  item_id: number;
  status: 'owned' | 'considering' | 'retired';
}

export interface CatalogItem {
  aliases: string[];
  cat: Category;
  icon: string;
  name: string;
  price: number;
  meta: string;
  specs: Spec[];
}

export interface Candidate {
  name: string;
  icon: string;
  cat: Category | null;
  price: number | null;
  meta: string;
  specs: Spec[] | null;
}

/**
 * better / worse: a noticeable change in a direction that matters
 * similar:        changed, but below the threshold a person would notice
 * same:           identical
 * different:      changed with no better/worse (screen size, chips from different families)
 * unknown:        one side has no data, never counted
 */
export type DeltaKind = 'better' | 'worse' | 'similar' | 'same' | 'different' | 'unknown';

export type Significance = 'major' | 'minor';

export interface DeltaRow {
  k: string;
  own: string;
  cand: string;
  kind: DeltaKind;
  /** Pill text for the UI ("Much better", "No data", ...). */
  label: string;
  significance?: Significance;
  importance: 'core' | 'minor';
  /** Noun used in verdict copy ("zoom", "battery life"). */
  noun: string;
  /** Adjective used instead of the noun ("lighter" / "heavier"), if the spec has one. */
  adj?: string;
  /** Signed contribution to the verdict score. */
  points: number;
}

export type VerdictKind = 'skip' | 'wait' | 'buy' | 'clear';

export interface VerdictMeta {
  key: string;
  value: string;
}

export interface Verdict {
  kind: VerdictKind;
  tag: string;
  head: string;
  rationale: string;
  meta: VerdictMeta[];
  candidate: Candidate;
  ownedItem: OwnedItem | null;
  comparison: DeltaRow[] | null;
  suggestSellExisting?: boolean;
}

export interface ClassifyResult {
  candidate: Candidate;
  /** True only when we know exactly which product this is. */
  matched: boolean;
  cacheHit: boolean;
  /** Known products the query might mean, when it was not an exact match. */
  suggestions: string[];
}

export interface DecideInput {
  query: string;
  price?: number | null;
}

export interface DecideResult {
  verdict: Verdict;
  classify: ClassifyResult;
}

export interface Preferences {
  /** Categories the user tends to upgrade eagerly vs hold back */
  upgradeAppetite: Partial<Record<Category, 'hold' | 'neutral' | 'eager'>>;
  /** Last decisions for learning (future: AI recommendations) */
  recentDecisions: Array<{
    item: string;
    outcome: 'skip' | 'buy';
    at: string;
  }>;
}

export interface AppState {
  inventory: OwnedItem[];
  preferences: Preferences;
  specCache: Record<string, Spec[]>;
}

export interface AIAdapter {
  classify(query: string): Promise<{ cat: Category | null; name: string }>;
  judge(context: {
    candidate: Candidate;
    ownedItem: OwnedItem | null;
    comparison: DeltaRow[] | null;
  }): Promise<{ kind: VerdictKind; head: string; rationale: string }>;
  recommendNext(context: {
    candidate: Candidate;
    verdict: Verdict;
    preferences: Preferences;
  }): Promise<Candidate | null>;
}

export interface ProductSpecsAdapter {
  fetchSpecs(productName: string): Promise<Spec[]>;
}
