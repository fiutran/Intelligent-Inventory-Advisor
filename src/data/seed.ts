import type { CatalogItem, Category, OwnedItem, Spec, SpecWeight } from '../core/types.js';

export const CATEGORY_WORDS: Record<Category, string[]> = {
  phone: ['phone', 'iphone', 'pixel', 'galaxy', 'android', 'samsung'],
  earbuds: ['earbud', 'airpod', 'buds'],
  headphones: ['headphone', 'over-ear', 'wh-1000', 'xm5', 'xm4'],
  charger: ['charger', 'adapter', 'gan', 'watt'],
  camera: ['camera', 'dslr', 'mirrorless', 'a6400', 'a7', 'α'],
  tablet: ['tablet', 'ipad'],
  laptop: ['laptop', 'macbook', 'notebook'],
  watch: ['watch'],
  tv: ['tv', 'television'],
  speaker: ['speaker', 'soundbar'],
};

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

const PHONE_HIGH = new Set(['Main camera', 'Tele zoom', 'Port']);

export function withOwnershipWeights(specs: Spec[], cat: Category): Spec[] {
  return specs.map((s) => {
    if (s.w) return s;
    let w: SpecWeight = 'low';
    if (cat === 'phone' && PHONE_HIGH.has(s.k)) w = 'high';
    if (cat === 'earbuds' && (s.k === 'ANC' || s.k === 'Chip')) w = 'high';
    if (cat === 'charger' && (s.k === 'Power' || s.k === 'Ports')) w = 'high';
    if (cat === 'camera' && s.k === 'Sensor') w = 'high';
    return { ...s, w };
  });
}

function phoneSpecs(rows: Array<[string, string]>): Spec[] {
  return rows.map(([k, v]) => ({ k, v }));
}

/** Demo inventory templates (not auto-inserted anymore). */
export const SEED_OWNED: OwnedItem[] = [
  {
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 14 Pro',
    paid: 1249,
    since: 'Sep 2022',
    prov: 'receipt',
    meta: '256 GB · Deep Purple',
    specs: withOwnershipWeights(
      phoneSpecs([
        ['Chip', 'A16 Bionic'],
        ['Display', '6.1″ 120 Hz'],
        ['Main camera', '48 MP'],
        ['Tele zoom', '3×'],
        ['Port', 'Lightning'],
        ['Battery video', '23 h'],
        ['Weight', '206 g'],
      ]),
      'phone',
    ),
  },
];

export const SEED_CATALOG: CatalogItem[] = [
  {
    aliases: ['iphone 16 pro', '16 pro', 'iphone16pro'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 16 Pro',
    price: 1199,
    meta: '256 GB',
    specs: phoneSpecs([
      ['Chip', 'A18 Pro'],
      ['Display', '6.3″ 120 Hz'],
      ['Main camera', '48 MP'],
      ['Tele zoom', '5×'],
      ['Port', 'USB-C'],
      ['Battery video', '27 h'],
      ['Weight', '199 g'],
    ]),
  },
  {
    aliases: ['iphone 15 pro', '15 pro'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 15 Pro',
    price: 1099,
    meta: '256 GB',
    specs: phoneSpecs([
      ['Chip', 'A17 Pro'],
      ['Display', '6.1″ 120 Hz'],
      ['Main camera', '48 MP'],
      ['Tele zoom', '3×'],
      ['Port', 'USB-C'],
      ['Battery video', '23 h'],
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
    specs: phoneSpecs([
      ['Chip', 'A16 Bionic'],
      ['Display', '6.1″ 60 Hz'],
      ['Main camera', '48 MP'],
      ['Tele zoom', '2× crop'],
      ['Port', 'USB-C'],
      ['Battery video', '20 h'],
      ['Weight', '171 g'],
    ]),
  },
  {
    aliases: ['iphone 14 pro', '14 pro', 'iphone14pro'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 14 Pro',
    price: 999,
    meta: '256 GB',
    specs: phoneSpecs([
      ['Chip', 'A16 Bionic'],
      ['Display', '6.1″ 120 Hz'],
      ['Main camera', '48 MP'],
      ['Tele zoom', '3×'],
      ['Port', 'Lightning'],
      ['Battery video', '23 h'],
      ['Weight', '206 g'],
    ]),
  },
  {
    aliases: ['iphone 14', 'iphone14'],
    cat: 'phone',
    icon: '📱',
    name: 'iPhone 14',
    price: 699,
    meta: '128 GB',
    specs: phoneSpecs([
      ['Chip', 'A15 Bionic'],
      ['Display', '6.1″ 60 Hz'],
      ['Main camera', '12 MP'],
      ['Tele zoom', '2× crop'],
      ['Port', 'Lightning'],
      ['Battery video', '20 h'],
      ['Weight', '172 g'],
    ]),
  },
  {
    aliases: ['galaxy s24', 's24', 'samsung s24', 'samsung galaxy s24'],
    cat: 'phone',
    icon: '📱',
    name: 'Galaxy S24',
    price: 799,
    meta: '128 GB',
    specs: phoneSpecs([
      ['Chip', 'Snapdragon 8 Gen 3'],
      ['Display', '6.2″ 120 Hz'],
      ['Main camera', '50 MP'],
      ['Tele zoom', '3×'],
      ['Port', 'USB-C'],
      ['Battery video', '22 h'],
      ['Weight', '167 g'],
    ]),
  },
  {
    aliases: ['galaxy s23', 's23', 'samsung s23', 'samsung galaxy s23'],
    cat: 'phone',
    icon: '📱',
    name: 'Galaxy S23',
    price: 699,
    meta: '128 GB',
    specs: phoneSpecs([
      ['Chip', 'Snapdragon 8 Gen 2'],
      ['Display', '6.1″ 120 Hz'],
      ['Main camera', '50 MP'],
      ['Tele zoom', '3×'],
      ['Port', 'USB-C'],
      ['Battery video', '20 h'],
      ['Weight', '168 g'],
    ]),
  },
  {
    aliases: ['pixel 8', 'google pixel 8', 'pixel8'],
    cat: 'phone',
    icon: '📱',
    name: 'Pixel 8',
    price: 699,
    meta: '128 GB',
    specs: phoneSpecs([
      ['Chip', 'Tensor G3'],
      ['Display', '6.2″ 120 Hz'],
      ['Main camera', '50 MP'],
      ['Tele zoom', '2×'],
      ['Port', 'USB-C'],
      ['Battery video', '21 h'],
      ['Weight', '187 g'],
    ]),
  },
  {
    aliases: ['pixel 9', 'google pixel 9', 'pixel9'],
    cat: 'phone',
    icon: '📱',
    name: 'Pixel 9',
    price: 799,
    meta: '128 GB',
    specs: phoneSpecs([
      ['Chip', 'Tensor G4'],
      ['Display', '6.3″ 120 Hz'],
      ['Main camera', '50 MP'],
      ['Tele zoom', '2×'],
      ['Port', 'USB-C'],
      ['Battery video', '24 h'],
      ['Weight', '198 g'],
    ]),
  },
  {
    aliases: ['airpods pro', 'airpods pro 2', 'airpods'],
    cat: 'earbuds',
    icon: '🎧',
    name: 'AirPods Pro (2nd gen)',
    price: 279,
    meta: 'USB-C case',
    specs: [
      { k: 'ANC', v: '2nd-gen' },
      { k: 'Chip', v: 'H2' },
      { k: 'Case', v: 'USB-C' },
    ],
  },
  {
    aliases: ['anker 100w charger', 'anker 100', '100w charger', '100w'],
    cat: 'charger',
    icon: '🔌',
    name: 'Anker 100W charger',
    price: 59,
    meta: 'GaN · 3 ports',
    specs: [
      { k: 'Power', v: '100 W' },
      { k: 'Tech', v: 'GaN' },
      { k: 'Ports', v: '3' },
    ],
  },
  {
    aliases: ['anker 65w', 'anker 65w charger', '65w charger'],
    cat: 'charger',
    icon: '🔌',
    name: 'Anker 65W charger',
    price: 45,
    meta: 'GaN · 3 ports',
    specs: [
      { k: 'Power', v: '65 W' },
      { k: 'Tech', v: 'GaN' },
      { k: 'Ports', v: '3' },
    ],
  },
  {
    aliases: ['sony a7 iv', 'a7 iv', 'a7iv', 'sony a7'],
    cat: 'camera',
    icon: '📷',
    name: 'Sony α7 IV',
    price: 2499,
    meta: 'Full-frame',
    specs: [
      { k: 'Sensor', v: 'Full-frame' },
      { k: 'Resolution', v: '33 MP' },
      { k: 'Video', v: '4K60' },
    ],
  },
  {
    aliases: ['sony a6400', 'a6400', 'α6400'],
    cat: 'camera',
    icon: '📷',
    name: 'Sony α6400',
    price: 900,
    meta: 'APS-C · 24 MP',
    specs: [
      { k: 'Sensor', v: 'APS-C' },
      { k: 'Resolution', v: '24 MP' },
      { k: 'Video', v: '4K30' },
    ],
  },
  {
    aliases: ['ipad air', 'ipad'],
    cat: 'tablet',
    icon: '📱',
    name: 'iPad Air',
    price: 699,
    meta: '11″ · M2',
    specs: [
      { k: 'Chip', v: 'M2' },
      { k: 'Display', v: '11″ Liquid Retina' },
      { k: 'Port', v: 'USB-C' },
    ],
  },
];

export function normalizeProductQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[α]/g, 'a')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Find a catalog product by typed name or alias. */
export function findCatalogItem(
  query: string,
  catalog: CatalogItem[] = SEED_CATALOG,
): CatalogItem | undefined {
  const q = normalizeProductQuery(query);
  if (!q) return undefined;

  const byExactName = catalog.find((c) => normalizeProductQuery(c.name) === q);
  if (byExactName) return byExactName;

  const byAliasExact = catalog.find((c) =>
    c.aliases.some((a) => normalizeProductQuery(a) === q),
  );
  if (byAliasExact) return byAliasExact;

  const byAliasIncludes = catalog.find((c) =>
    c.aliases.some((a) => {
      const na = normalizeProductQuery(a);
      return q.includes(na) || na.includes(q);
    }),
  );
  if (byAliasIncludes) return byAliasIncludes;

  return catalog.find((c) => {
    const nn = normalizeProductQuery(c.name);
    return q.includes(nn) || nn.includes(q);
  });
}

/** Fill empty owned specs from the product library when the name matches. */
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
    specs: withOwnershipWeights(hit.specs, item.cat),
  };
}
