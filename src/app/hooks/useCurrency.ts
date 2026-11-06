import { useState } from 'react';
import { isCurrency, type CurrencyCode } from '../../core/currency';

const KEY = 'intelligent-inventory-advisor-currency';

export function useCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem(KEY);
    return isCurrency(saved) ? saved : 'EUR';
  });

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem(KEY, code);
  };

  return { currency, setCurrency };
}
