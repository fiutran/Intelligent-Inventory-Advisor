import type { AIAdapter } from '../core/types.js';
import { isLlmConfigured, researchProduct, refineVerdict } from './llm.js';

/**
 * Legacy adapter surface: prefer researchProduct / refineVerdict from ./llm.js.
 * classify() here maps onto LLM research when configured.
 */
export const aiAdapter: AIAdapter = {
  async classify(query) {
    if (!isLlmConfigured()) {
      throw new Error(
        `LLM not configured for "${query}". Set LLM_API_KEY in .env (see .env.example).`,
      );
    }
    const product = await researchProduct(query);
    if (!product) return { cat: null, name: query };
    return { cat: product.cat, name: product.name };
  },

  async judge(context) {
    if (!isLlmConfigured()) {
      throw new Error('LLM not configured');
    }
    const polished = await refineVerdict({
      candidate: context.candidate,
      ownedItem: context.ownedItem,
      comparison: context.comparison,
      draft: {
        kind: 'wait',
        tag: 'Verdict · borderline',
        head: 'Needs a closer look.',
        rationale: 'Rule-based draft unavailable.',
      },
    });
    if (!polished) {
      throw new Error('LLM judge returned nothing');
    }
    return polished;
  },

  async recommendNext(_context) {
    return null;
  },
};
