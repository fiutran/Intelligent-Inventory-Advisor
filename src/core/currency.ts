export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'US dollar' },
  { code: 'GBP', symbol: '£', label: 'British pound' },
  { code: 'INR', symbol: '₹', label: 'Indian rupee' },
  { code: 'AUD', symbol: 'A$', label: 'Australian dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian dollar' },
  { code: 'JPY', symbol: '¥', label: 'Japanese yen' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

/** Approximate units per 1 euro. Lookup prices are stored in euros and shown in the chosen currency. */
const PER_EUR: Record<CurrencyCode, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.84,
  INR: 96,
  AUD: 1.65,
  CAD: 1.48,
  JPY: 165,
};

export function isCurrency(value: string | undefined | null): value is CurrencyCode {
  return CURRENCIES.some((item) => item.code === value);
}

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES.find((item) => item.code === code)?.symbol ?? '€';
}

export function convertFromEur(amount: number, code: CurrencyCode): number {
  const converted = amount * PER_EUR[code];
  return code === 'JPY' ? Math.round(converted) : Math.round(converted);
}

export function formatMoney(amount: number | null, code: CurrencyCode = 'EUR'): string {
  if (!amount) return '—';
  return `${currencySymbol(code)}${amount.toLocaleString('en-US')}`;
}
