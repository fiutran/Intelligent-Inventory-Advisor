import type { Category, DeltaRow, Spec, Verdict, VerdictKind } from '../core/types.js';

/** Router branch stored on Decision.branch */
export type DecisionBranch =
  | 'duplicate'
  | 'upgrade'
  | 'overlap_unknown'
  | 'gap'
  | 'unrecognised';

export type InventoryStatus = 'owned' | 'retired' | 'considering' | 'sold';

export type Provenance = 'receipt' | 'photo' | 'manual';

export type Confidence = 'high' | 'medium' | 'low';

export type KeywordSource = 'seed' | 'user' | 'ai';

export type AliasSource = 'seed' | 'user' | 'ai';

/** Frozen verdict shown on the Verdict screen, stored in decision.payload */
export interface DecisionPayload {
  kind: VerdictKind;
  tag: string;
  head: string;
  rationale: string;
  meta: Array<{ key: string; value: string }>;
  comparison: DeltaRow[] | null;
  candidate: {
    name: string;
    icon: string;
    cat: Category | null;
    price: number | null;
    meta: string;
    product_key: string | null;
  };
  classify: {
    matched: boolean;
    cacheHit: boolean;
  };
}

export interface UserRow {
  user_id: number;
  name: string;
  created_at: string;
}

export interface CategoryRow {
  category_id: number;
  name: Category;
  icon: string | null;
}

export interface PreferenceWeightRow {
  user_id: number;
  attribute: string;
  weight: number;
  evidence_count: number;
  updated_at: string;
}

export interface KeywordRow {
  keyword_id: number;
  category_id: number;
  word: string;
  source: KeywordSource;
}

export interface InventoryItemRow {
  item_id: number;
  user_id: number;
  category_id: number;
  brand: string | null;
  model: string;
  summary: string | null;
  icon: string | null;
  price: number | null;
  release_year: number | null;
  specs: Spec[];
  provenance: Provenance;
  confidence: Confidence | null;
  status: InventoryStatus;
  acquired_at: string | null;
}

export interface ProductCacheRow {
  product_key: string;
  category_id: number;
  brand: string | null;
  model: string;
  summary: string | null;
  icon: string | null;
  price: number | null;
  specs: Spec[];
  source: string;
  researched_at: string;
  expires_at: string | null;
}

export interface ProductAliasRow {
  alias_id: number;
  product_key: string;
  alias: string;
  source: AliasSource;
}

export interface DecisionRow {
  decision_id: number;
  user_id: number;
  category_id: number | null;
  query: string;
  branch: DecisionBranch;
  matched_item_id: number | null;
  verdict: VerdictKind;
  stated_price: number | null;
  payload: DecisionPayload;
  bought_against_advice: boolean;
  retired_item_id: number | null;
  chosen_product_key: string | null;
  purchased: boolean | null;
  created_at: string;
}

export interface RecommendationOptionRow {
  option_id: number;
  decision_id: number;
  product_key: string;
  was_chosen: boolean;
}

/** Input for inserting a new decision row */
export interface NewDecisionRow {
  user_id: number;
  category_id: number | null;
  query: string;
  branch: DecisionBranch;
  matched_item_id: number | null;
  verdict: VerdictKind;
  stated_price: number | null;
  payload: DecisionPayload;
  bought_against_advice: boolean;
  retired_item_id: number | null;
  chosen_product_key: string | null;
  purchased: boolean;
}

/** How domain objects map onto tables */
export const SCHEMA_MAP = {
  user: 'user',
  category: 'category',
  preferences: 'preference_weight',
  classifierKeywords: 'keyword',
  inventory: 'inventory_item',
  specCache: 'product_cache',
  productAliases: 'product_alias',
  decisions: 'decision',
  nextOptions: 'recommendation_option',
} as const;
