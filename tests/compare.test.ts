import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareSpecs, parseChip, summarize } from '../src/core/compare.ts';
import { decide } from '../src/core/router.ts';
import { normalizeSpecs } from '../src/core/specs.ts';
import type { OwnedItem, Verdict } from '../src/core/types.ts';
import { SEED_CATALOG } from '../src/data/seed.ts';

const NOW = new Date('2026-11-04');

function own(productName: string, since = '2025-10-01'): OwnedItem {
  const p = SEED_CATALOG.find((c) => c.name === productName);
  if (!p) throw new Error(`not in catalog: ${productName}`);
  return { cat: p.cat, icon: p.icon, name: p.name, paid: p.price, since, prov: 'manual', meta: p.meta, specs: p.specs };
}

async function verdictFor(query: string, owned: OwnedItem[]): Promise<Verdict> {
  return (await decide({ query }, { inventory: owned, now: NOW })).verdict;
}

const row = (v: Verdict, k: string) => v.comparison?.find((r) => r.k === k);

describe('spec normalisation', () => {
  it('maps legacy rows from old databases onto canonical keys', () => {
    const legacy = normalizeSpecs(
      [
        { k: 'Display', v: '6.1″ 120 Hz' },
        { k: 'Battery video', v: '23 h' },
        { k: 'processor', v: 'A16 Bionic' },
      ],
      'phone',
    );
    assert.deepEqual(
      legacy.map((s) => [s.k, s.v]),
      [
        ['Chip', 'A16 Bionic'],
        ['Battery', '23 h'],
        ['Refresh rate', '120 Hz'],
        ['Screen', '6.1″'],
      ],
    );
  });
});

describe('chip generations', () => {
  it('ranks within a family and refuses to rank across families', () => {
    assert.ok(parseChip('A18 Pro')!.score > parseChip('A17 Pro')!.score);
    assert.ok(parseChip('Snapdragon 8 Elite')!.score > parseChip('Snapdragon 8 Gen 3')!.score);
    const rows = compareSpecs('phone', [{ k: 'Chip', v: 'Tensor G4' }], [{ k: 'Chip', v: 'A18 Pro' }]);
    assert.equal(rows[0].kind, 'different');
    assert.equal(rows[0].points, 0);
  });
});

describe('comparison has direction', () => {
  it('counts a downgrade as a loss, not an upgrade', async () => {
    // Used to say "2 real upgrades" because 5×→3× and USB-C→Lightning "changed".
    const v = await verdictFor('iPhone 14 Pro', [own('iPhone 16 Pro')]);
    assert.equal(row(v, 'Tele zoom')!.kind, 'worse');
    assert.equal(row(v, 'Port')!.kind, 'worse');
    assert.equal(row(v, 'Chip')!.kind, 'worse');
    assert.equal(v.kind, 'skip');
    assert.match(v.head, /step down/);
  });

  it('treats a small difference as "about the same"', () => {
    const rows = compareSpecs('phone', [{ k: 'Weight', v: '199 g' }], [{ k: 'Weight', v: '206 g' }]);
    assert.equal(rows[0].kind, 'similar');
    assert.equal(rows[0].points, 0);
  });

  it('knows lower weight is better', () => {
    const rows = compareSpecs('phone', [{ k: 'Weight', v: '230 g' }], [{ k: 'Weight', v: '170 g' }]);
    assert.equal(rows[0].kind, 'better');
  });

  it('treats a missing telephoto as zero zoom, so gaining one is a big upgrade', () => {
    const rows = compareSpecs('phone', [{ k: 'Tele zoom', v: 'None' }], [{ k: 'Tele zoom', v: '5×' }]);
    assert.equal(rows[0].kind, 'better');
    assert.equal(rows[0].significance, 'major');
  });

  it('never scores a spec only one side has', () => {
    const rows = compareSpecs('phone', [{ k: 'Chip', v: 'A16 Bionic' }], [{ k: 'Battery', v: '30 h' }]);
    assert.ok(rows.every((r) => r.kind === 'unknown' && r.points === 0));
    assert.equal(summarize(rows).comparable, 0);
  });

  it('shows screen size as different, not better or worse', () => {
    const rows = compareSpecs('phone', [{ k: 'Screen', v: '6.1″' }], [{ k: 'Screen', v: '6.7″' }]);
    assert.equal(rows[0].kind, 'different');
    assert.equal(rows[0].label, 'Bigger');
  });
});

describe('verdicts', () => {
  it('a two-generation jump is worth it', async () => {
    const v = await verdictFor('iPhone 16 Pro', [own('iPhone 14 Pro')]);
    assert.equal(v.kind, 'buy');
    assert.equal(row(v, 'Port')!.kind, 'better');
  });

  it('a one-generation step is only a modest upgrade', async () => {
    const v = await verdictFor('iPhone 16 Pro', [own('iPhone 15 Pro')]);
    assert.equal(v.kind, 'wait');
  });

  it('a chip bump alone is barely an upgrade', async () => {
    const v = await verdictFor('Pixel 9', [own('Pixel 8')]);
    assert.equal(v.kind, 'skip');
    assert.match(v.head, /Barely/);
  });

  it('an old device gets a lower bar', async () => {
    const fresh = await verdictFor('iPhone 15', [own('iPhone 14', '2026-06-01')]);
    const old = await verdictFor('iPhone 15', [own('iPhone 14', 'Sep 2022')]);
    assert.equal(fresh.kind, 'wait');
    assert.equal(old.kind, 'buy');
    assert.match(old.rationale, /4 years old/);
  });

  it('full-frame over APS-C is flagged as a real gain', async () => {
    const v = await verdictFor('Sony a7 IV', [own('Sony α6400')]);
    assert.equal(row(v, 'Sensor')!.kind, 'better');
    assert.equal(row(v, 'Weight')!.kind, 'worse');
    assert.notEqual(v.kind, 'skip');
  });

  it('owning the exact model is a duplicate, even with a brand prefix', async () => {
    const v = await verdictFor('Apple AirPods Pro 2', [own('AirPods Pro (2nd gen)')]);
    assert.equal(v.tag, 'Verdict · you already own this');
  });

  it('AirPods Max is not "you already own this" when you own AirPods Pro', async () => {
    const v = await verdictFor('AirPods Max', [own('AirPods Pro (2nd gen)')]);
    assert.notEqual(v.tag, 'Verdict · you already own this');
  });

  it('a vague query returns suggestions instead of a substitute', async () => {
    const r = await decide({ query: 'ipad' }, { inventory: [], now: NOW });
    assert.equal(r.classify.matched, false);
    assert.deepEqual(r.classify.suggestions, ['iPad Air (M2)']);
  });

  it('the AI can reword the verdict but never change it', async () => {
    const r = await decide(
      { query: 'iPhone 14 Pro' },
      {
        inventory: [own('iPhone 16 Pro')],
        now: NOW,
        refineVerdict: async () => ({ kind: 'buy', tag: 'Verdict · worth it', head: 'Go for it!', rationale: 'Nice phone.' }),
      },
    );
    assert.equal(r.verdict.kind, 'skip');
    assert.equal(r.verdict.tag, 'Verdict · step down');
    assert.equal(r.verdict.head, 'Go for it!');
  });
});
