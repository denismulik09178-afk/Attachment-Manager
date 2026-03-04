const CURRENCY_COLORS: Record<string, { bg: string; text: string; code: string }> = {
  EUR: { bg: 'bg-blue-600', text: 'text-white', code: 'EU' },
  USD: { bg: 'bg-red-600', text: 'text-white', code: 'US' },
  GBP: { bg: 'bg-blue-800', text: 'text-white', code: 'GB' },
  JPY: { bg: 'bg-white', text: 'text-rose-600', code: 'JP' },
  CHF: { bg: 'bg-red-600', text: 'text-white', code: 'CH' },
  CAD: { bg: 'bg-red-700', text: 'text-white', code: 'CA' },
  AUD: { bg: 'bg-blue-700', text: 'text-white', code: 'AU' },
  NZD: { bg: 'bg-blue-900', text: 'text-white', code: 'NZ' },
};

export function getCurrencyInfo(currency: string) {
  if (!currency) return { bg: 'bg-gray-600', text: 'text-white', code: '??' };
  return CURRENCY_COLORS[currency] || { bg: 'bg-gray-600', text: 'text-white', code: currency.slice(0, 2) };
}

export function getPairCurrencies(symbol: string): { base: string; quote: string } {
  if (!symbol) return { base: '', quote: '' };
  if (symbol.includes('/')) {
    const parts = symbol.split('/');
    return { base: parts[0], quote: parts[1] || '' };
  }
  if (symbol.length >= 6) {
    return { base: symbol.slice(0, 3), quote: symbol.slice(3, 6) };
  }
  return { base: symbol, quote: '' };
}
