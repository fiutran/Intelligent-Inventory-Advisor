import type { ProductSpecsAdapter } from '../core/types.js';

/**
 * Stub — called only when spec cache misses for a known product.
 * Wire to a product specs API in production.
 */
export const productSpecsAdapter: ProductSpecsAdapter = {
  async fetchSpecs(productName) {
    throw new Error(
      `[productSpecsAdapter.fetchSpecs] Not implemented — no cached specs for "${productName}".`,
    );
  },
};
