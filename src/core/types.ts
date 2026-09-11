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

export type DeltaKind = 'same' | 'mean' | 'marg' | 'new';

export interface DeltaRow {
  k: string;
  own: string;
  cand: string;
  kind: DeltaKind;
  label: string;
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
  matched: boolean;
  cacheHit: boolean;
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
