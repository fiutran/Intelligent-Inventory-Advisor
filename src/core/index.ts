export type * from './types.js';
export { classify, resolveSpecs, guessCategory } from './classifier.js';
export { findOwned, findSameName, ownsCategory } from './ownership.js';
export { compareSpecs, summarize } from './compare.js';
export type { ComparisonSummary } from './compare.js';
export { matchProduct, sameProduct, tokenize, normalizeProductQuery } from './match.js';
export type { MatchResult } from './match.js';
export { normalizeSpecs, SPEC_SCHEMA } from './specs.js';
export {
  buildVerdictFromContext,
  decideUpgrade,
  shouldSuggestSell,
  withSellSuggestion,
} from './verdict.js';
export { decide } from './router.js';
export type { RouterDeps } from './router.js';
