import type { AIAdapter } from '../core/types.js';

/**
 * Stub — called only when local classifier misses.
 * Wire to your AI model API in production.
 */
export const aiAdapter: AIAdapter = {
  async classify(query) {
    throw new Error(
      `[aiAdapter.classify] Not implemented — cache miss for "${query}". ` +
        'Provide an AI adapter or expand the local catalog.',
    );
  },

  async judge(_context) {
    throw new Error(
      '[aiAdapter.judge] Not implemented — use local delta/verdict for known models.',
    );
  },

  async recommendNext(_context) {
    // No recommendation loop in v0 scaffold
    return null;
  },
};
