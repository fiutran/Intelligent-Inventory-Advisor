export type * from './types.js';
export { classify, resolveSpecs } from './classifier.js';
export { findOwned, findSameName, ownsCategory } from './ownership.js';
export { compareSpecs, summarizeDelta, costPerGain } from './delta.js';
export {
  buildVerdictFromContext,
  shouldSuggestSell,
  withSellSuggestion,
} from './verdict.js';
export { decide } from './router.js';
export type { RouterDeps } from './router.js';
