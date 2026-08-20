import { decide } from './core/index.js';

const scenarios = [
  { query: 'iPhone 16 Pro', label: 'Known upgrade (phone)' },
  { query: 'AirPods Pro 2', label: 'Exact duplicate (earbuds)' },
  { query: 'iPad Air', label: 'New category (tablet)' },
  { query: 'some random gadget', label: 'Unrecognised item' },
];

console.log('Inventory Delta Advisor — core demo\n');

for (const { query, label } of scenarios) {
  const { verdict, classify: cls } = await decide({ query });
  console.log(`── ${label}: "${query}"`);
  console.log(`   matched: ${cls.matched} · cacheHit: ${cls.cacheHit}`);
  console.log(`   ${verdict.tag}`);
  console.log(`   → ${verdict.head}`);
  if (verdict.comparison?.length) {
    const gains = verdict.comparison.filter((r) => r.kind === 'mean' || r.kind === 'new').length;
    console.log(`   ${gains} real gains across ${verdict.comparison.length} specs`);
  }
  console.log();
}
