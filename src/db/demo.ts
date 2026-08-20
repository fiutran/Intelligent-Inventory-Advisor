import { decide } from '../core/index.js';
import { SEED_OWNED } from '../data/seed.js';
import { seedProductAliasRows, verdictToNewDecision } from './map.js';

const { verdict, classify } = await decide(
  { query: 'iPhone 16 Pro', price: 1100 },
  { inventory: SEED_OWNED },
);

const row = verdictToNewDecision({
  user_id: 1,
  query: 'iPhone 16 Pro',
  stated_price: 1100,
  verdict,
  classify,
  purchased: false,
  matched_item_id: 1,
});

console.log('Decision branch:', row.branch);
console.log('Verdict:', row.verdict);
console.log('Payload head:', row.payload.head);
console.log('Comparison rows:', row.payload.comparison?.length ?? 0);
console.log('Product aliases seeded:', seedProductAliasRows().length);
