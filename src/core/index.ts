export type * from './types.js';
export { classify, resolveSpecs, guessCategory } from './classifier.js';
export { findOwned, findSameName, ownsCategory, ownedInCategory, relevantOwned } from './ownership.js';
export { compareSpecs, summarizeDelta, costPerGain } from './delta.js';
export {
  buildVerdictFromContext,
  shouldSuggestSell,
  withSellSuggestion,
} from './verdict.js';
export { decide } from './router.js';
export type { RouterDeps } from './router.js';
