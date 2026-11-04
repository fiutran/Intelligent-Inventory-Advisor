import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { guessCategory } from '../src/core/classifier.ts';
import { matchProduct, sameProduct, tokenize } from '../src/core/match.ts';
import { SEED_CATALOG } from '../src/data/seed.ts';

const match = (q: string) => matchProduct(q, SEED_CATALOG);
const name = (q: string) => match(q).product?.name ?? null;
const suggested = (q: string) => match(q).suggestions.map((s) => s.name);

describe('tokenize', () => {
  it('splits model numbers from letters and drops storage size', () => {
    assert.deepEqual(tokenize('iPhone16Pro 256GB'), ['iphone', '16', 'pro']);
    assert.deepEqual(tokenize('Sony α7 IV'), ['sony', 'a', '7', 'iv']);
    assert.deepEqual(tokenize('AirPods Pro (2nd gen)'), ['airpods', 'pro', '2', 'gen']);
  });
});

describe('matchProduct: exact models', () => {
  it('matches exact names, aliases, brand prefixes and colours', () => {
    assert.equal(name('iPhone 16 Pro'), 'iPhone 16 Pro');
    assert.equal(name('apple iphone 16 pro 256gb desert titanium'), 'iPhone 16 Pro');
    assert.equal(name('Samsung Galaxy S24'), 'Galaxy S24');
    assert.equal(name('google pixel 9'), 'Pixel 9');
    assert.equal(name('sony a7iv'), 'Sony α7 IV');
    assert.equal(name('AirPods Pro 2'), 'AirPods Pro (2nd gen)');
  });

  it('tells the base model and the Pro apart', () => {
    assert.equal(name('iPhone 16'), 'iPhone 16');
    assert.equal(name('iPhone 14'), 'iPhone 14');
    assert.equal(name('iPhone 14 Pro'), 'iPhone 14 Pro');
  });
});

describe('matchProduct: never substitutes a different model', () => {
  // Every one of these used to resolve to the listed wrong product.
  const cases: Array<[string, string]> = [
    ['iPhone 16 Pro Max', 'iPhone 16 Pro'],
    ['iPhone 16e', 'iPhone 16'],
    ['Pixel 9 Pro', 'Pixel 9'],
    ['Galaxy S24 Ultra', 'Galaxy S24'],
    ['iPad Pro M4', 'iPad Air (M2)'],
    ['AirPods Max', 'AirPods Pro (2nd gen)'],
    ['AirPods Pro 3', 'AirPods Pro (2nd gen)'],
    ['Sony a7R V', 'Sony α7 IV'],
    ['iPhone 16 Pro case', 'iPhone 16 Pro'],
    ['phone', 'iPhone 16 Pro'],
    ['charger', 'Anker 100W charger'],
  ];
  for (const [query, wrong] of cases) {
    it(`"${query}" is not ${wrong}`, () => {
      assert.equal(match(query).product, null);
    });
  }
});

describe('matchProduct: suggestions for less specific queries', () => {
  it('offers the family members a vague query could mean', () => {
    assert.deepEqual(suggested('ipad'), ['iPad Air (M2)']);
    assert.deepEqual(suggested('airpods'), ['AirPods Pro (2nd gen)']);
    assert.deepEqual(suggested('sony a7'), ['Sony α7 IV']);
    assert.deepEqual(suggested('anker charger').sort(), ['Anker 100W charger', 'Anker 65W charger']);
  });

  it('does not suggest a different model for a more specific query', () => {
    assert.deepEqual(suggested('AirPods Max'), []);
    assert.deepEqual(suggested('Galaxy S24 Ultra'), []);
    assert.deepEqual(suggested('iPhone 17 Pro'), []);
    assert.deepEqual(suggested('phone'), []);
  });
});

describe('sameProduct', () => {
  it('ignores brand, colour and case but not the model', () => {
    assert.equal(sameProduct('Apple iPhone 16 Pro', 'iphone 16 pro'), true);
    assert.equal(sameProduct('iPhone 16', 'iPhone 16 Pro'), false);
  });
});

describe('guessCategory', () => {
  it('uses whole words, so headphones are not phones', () => {
    assert.equal(guessCategory('Sony headphones'), 'headphones');
    assert.equal(guessCategory('Galaxy Buds 3'), 'earbuds');
    assert.equal(guessCategory('Galaxy Tab S9'), 'tablet');
    assert.equal(guessCategory('Galaxy Watch 7'), 'watch');
    assert.equal(guessCategory('Galaxy Z Fold 6'), 'phone');
    assert.equal(guessCategory('AirPods Max'), 'headphones');
    assert.equal(guessCategory('AirPods 4'), 'earbuds');
    assert.equal(guessCategory('coffee machine'), null);
  });
});
