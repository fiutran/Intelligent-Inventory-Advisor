import { matchProduct, normalizeProductQuery } from '../core/match.js';
import { normalizeSpecs } from '../core/specs.js';
import type { CatalogItem, Category, OwnedItem, Spec } from '../core/types.js';

export { normalizeProductQuery };

/**
 * Words that suggest a category. Matched against whole words (prefix), checked in
 * CATEGORY_ORDER so "Galaxy Buds" is earbuds and "Sony headphones" is not a phone.
 */
export const CATEGORY_WORDS: Record<Category, string[]> = {
  earbuds: ['earbud', 'airpod', 'buds', 'in-ear'],
  headphones: ['headphone', 'over-ear', 'wh-1000', 'xm5', 'xm4', 'quietcomfort', 'airpods max'],
  charger: ['charger', 'power adapter', 'gan', 'power brick'],
  camera: ['camera', 'dslr', 'mirrorless', 'a6400', 'a7', 'eos', 'lumix', 'fujifilm'],
  tablet: ['tablet', 'ipad', 'galaxy tab'],
  laptop: ['laptop', 'macbook', 'notebook', 'thinkpad', 'chromebook'],
  watch: ['watch', 'smartwatch'],
  tv: ['tv', 'television', 'oled tv'],
  speaker: ['speaker', 'soundbar', 'homepod', 'sonos'],
  phone: ['phone', 'smartphone', 'iphone', 'pixel', 'galaxy', 'android', 'oneplus'],
};

export const CATEGORY_ORDER: Category[] = [
  'earbuds', 'headphones', 'charger', 'camera', 'tablet', 'laptop', 'watch', 'tv', 'speaker', 'phone',
];

export const CATEGORY_LABEL: Record<Category, string> = {
  phone: 'phone',
  earbuds: 'pair of earbuds',
  headphones: 'pair of headphones',
  charger: 'charger',
  camera: 'camera',
  tablet: 'tablet',
  laptop: 'laptop',
  watch: 'watch',
  tv: 'TV',
  speaker: 'speaker',
};

/**
 * @deprecated use normalizeSpecs from core/specs. Kept so older call sites read the same.
 */
export function withOwnershipWeights(specs: Spec[], cat: Category): Spec[] {
  return normalizeSpecs(specs, cat);
}

function rows(cat: Category, pairs: Array<[string, string]>): Spec[] {
  return normalizeSpecs(
    pairs.map(([k, v]) => ({ k, v })),
    cat,
  );
}

/** Demo inventory template (not auto-inserted). */
export const SEED_OWNED: OwnedItem[] = [
  {
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 14 Pro',
    paid: 1249,
    since: 'Sep 2022',
    prov: 'receipt',
    meta: '256 GB · Deep Purple',
    specs: rows('phone', [
      ['Chip', 'A16 Bionic'],
      ['Tele zoom', '3×'],
      ['Battery', '23 h video'],
      ['Main camera', '48 MP'],
      ['Refresh rate', '120 Hz'],
      ['Screen', '6.1″'],
      ['Port', 'Lightning'],
      ['Weight', '206 g'],
    ]),
  },
];

/**
 * Built-in catalog. Aliases must identify ONE model: never add a bare family name
 * ("ipad", "airpods"), that is what suggestions are for.
 */
export const SEED_CATALOG: CatalogItem[] = [
  {
    aliases: ['iphone 16 pro', 'iphone16pro'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 16 Pro',
    price: 1199,
    meta: '256 GB',
    specs: rows('phone', [
      ['Chip', 'A18 Pro'],
      ['Tele zoom', '5×'],
      ['Battery', '27 h video'],
      ['Main camera', '48 MP'],
      ['Refresh rate', '120 Hz'],
      ['Screen', '6.3″'],
      ['Port', 'USB-C'],
      ['Weight', '199 g'],
    ]),
  },
  {
    aliases: ['iphone 16', 'iphone16'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 16',
    price: 949,
    meta: '128 GB',
    specs: rows('phone', [
      ['Chip', 'A18'],
      ['Tele zoom', 'None'],
      ['Battery', '22 h video'],
      ['Main camera', '48 MP'],
      ['Refresh rate', '60 Hz'],
      ['Screen', '6.1″'],
      ['Port', 'USB-C'],
      ['Weight', '170 g'],
    ]),
  },
  {
    aliases: ['iphone 15 pro', 'iphone15pro'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 15 Pro',
    price: 1099,
    meta: '256 GB',
    specs: rows('phone', [
      ['Chip', 'A17 Pro'],
      ['Tele zoom', '3×'],
      ['Battery', '23 h video'],
      ['Main camera', '48 MP'],
      ['Refresh rate', '120 Hz'],
      ['Screen', '6.1″'],
      ['Port', 'USB-C'],
      ['Weight', '187 g'],
    ]),
  },
  {
    aliases: ['iphone 15', 'iphone15'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 15',
    price: 799,
    meta: '128 GB',
    specs: rows('phone', [
      ['Chip', 'A16 Bionic'],
      ['Tele zoom', 'None'],
      ['Battery', '20 h video'],
      ['Main camera', '48 MP'],
      ['Refresh rate', '60 Hz'],
      ['Screen', '6.1″'],
      ['Port', 'USB-C'],
      ['Weight', '171 g'],
    ]),
  },
  {
    aliases: ['iphone 14 pro', 'iphone14pro'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 14 Pro',
    price: 999,
    meta: '256 GB',
    specs: SEED_OWNED[0].specs,
  },
  {
    aliases: ['iphone 14', 'iphone14'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 14',
    price: 699,
    meta: '128 GB',
    specs: rows('phone', [
      ['Chip', 'A15 Bionic'],
      ['Tele zoom', 'None'],
      ['Battery', '20 h video'],
      ['Main camera', '12 MP'],
      ['Refresh rate', '60 Hz'],
      ['Screen', '6.1″'],
      ['Port', 'Lightning'],
      ['Weight', '172 g'],
    ]),
  },
  {
    aliases: ['galaxy s24', 'samsung galaxy s24'],
    cat: 'phone',
    icon: '📱',
    name: 'Galaxy S24',
    price: 799,
    meta: '128 GB',
    specs: rows('phone', [
      ['Chip', 'Snapdragon 8 Gen 3'],
      ['Tele zoom', '3×'],
      ['Battery', '29 h video'],
      ['Main camera', '50 MP'],
      ['Refresh rate', '120 Hz'],
      ['Screen', '6.2″'],
      ['Port', 'USB-C'],
      ['Weight', '167 g'],
    ]),
  },
  {
    aliases: ['galaxy s23', 'samsung galaxy s23'],
    cat: 'phone',
    icon: '📱',
    name: 'Galaxy S23',
    price: 699,
    meta: '128 GB',
    specs: rows('phone', [
      ['Chip', 'Snapdragon 8 Gen 2'],
      ['Tele zoom', '3×'],
      ['Battery', '22 h video'],
      ['Main camera', '50 MP'],
      ['Refresh rate', '120 Hz'],
      ['Screen', '6.1″'],
      ['Port', 'USB-C'],
      ['Weight', '168 g'],
    ]),
  },
  {
    aliases: ['pixel 8', 'google pixel 8'],
    cat: 'phone',
    icon: '📱',
    name: 'Pixel 8',
    price: 699,
    meta: '128 GB',
    specs: rows('phone', [
      ['Chip', 'Tensor G3'],
      ['Tele zoom', 'None'],
      ['Main camera', '50 MP'],
      ['Refresh rate', '120 Hz'],
      ['Screen', '6.2″'],
      ['Port', 'USB-C'],
      ['Weight', '187 g'],
    ]),
  },
  {
    aliases: ['pixel 9', 'google pixel 9'],
    cat: 'phone',
    icon: '📱',
    name: 'Pixel 9',
    price: 799,
    meta: '128 GB',
    specs: rows('phone', [
      ['Chip', 'Tensor G4'],
      ['Tele zoom', 'None'],
      ['Main camera', '50 MP'],
      ['Refresh rate', '120 Hz'],
      ['Screen', '6.3″'],
      ['Port', 'USB-C'],
      ['Weight', '198 g'],
    ]),
  },
  {
    aliases: ['airpods pro 2', 'airpods pro'],
    cat: 'earbuds',
    icon: '🎧',
    name: 'AirPods Pro (2nd gen)',
    price: 279,
    meta: 'USB-C case',
    specs: rows('earbuds', [
      ['Chip', 'H2'],
      ['ANC', 'Adaptive'],
      ['Battery', '6 h'],
      ['Port', 'USB-C'],
    ]),
  },
  {
    aliases: ['anker 100w charger', 'anker 100w'],
    cat: 'charger',
    icon: '🔌',
    name: 'Anker 100W charger',
    price: 59,
    meta: 'GaN · 3 ports',
    specs: rows('charger', [
      ['Power', '100 W'],
      ['Ports', '3'],
      ['Tech', 'GaN'],
    ]),
  },
  {
    aliases: ['anker 65w charger', 'anker 65w'],
    cat: 'charger',
    icon: '🔌',
    name: 'Anker 65W charger',
    price: 45,
    meta: 'GaN · 3 ports',
    specs: rows('charger', [
      ['Power', '65 W'],
      ['Ports', '3'],
      ['Tech', 'GaN'],
    ]),
  },
  {
    aliases: ['sony a7 iv', 'a7 iv', 'a7iv'],
    cat: 'camera',
    icon: '📷',
    name: 'Sony α7 IV',
    price: 2499,
    meta: 'Full-frame · 33 MP',
    specs: rows('camera', [
      ['Sensor', 'Full-frame'],
      ['Video', '4K60'],
      ['Resolution', '33 MP'],
      ['Weight', '658 g'],
    ]),
  },
  {
    aliases: ['sony a6400', 'a6400'],
    cat: 'camera',
    icon: '📷',
    name: 'Sony α6400',
    price: 900,
    meta: 'APS-C · 24 MP',
    specs: rows('camera', [
      ['Sensor', 'APS-C'],
      ['Video', '4K30'],
      ['Resolution', '24 MP'],
      ['Weight', '403 g'],
    ]),
  },
  {
    aliases: ['ipad air m2', 'ipad air'],
    cat: 'tablet',
    icon: '📱',
    name: 'iPad Air (M2)',
    price: 699,
    meta: '11″ · M2',
    specs: rows('tablet', [
      ['Chip', 'M2'],
      ['Refresh rate', '60 Hz'],
      ['Screen', '11″'],
      ['Port', 'USB-C'],
      ['Weight', '462 g'],
    ]),
  },
];

/** Exact product match only. Use matchProduct directly when you want suggestions. */
export function findCatalogItem(
  query: string,
  catalog: CatalogItem[] = SEED_CATALOG,
): CatalogItem | undefined {
  return matchProduct(query, catalog).product ?? undefined;
}

export function enrichOwnedFromCatalog(
  item: OwnedItem,
  catalog: CatalogItem[] = SEED_CATALOG,
): OwnedItem {
  if (item.specs.length > 0) return item;
  const hit = findCatalogItem(item.name, catalog);
  if (!hit) return item;
  return {
    ...item,
    icon: item.icon || hit.icon,
    meta: item.meta || hit.meta,
    specs: normalizeSpecs(hit.specs, item.cat),
  };
}
