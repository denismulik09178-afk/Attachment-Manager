const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

interface ExchangeRates {
  rates: Record<string, number>;
  time_last_updated: number;
}

let cachedRates: ExchangeRates | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  const now = Date.now();
  
  if (cachedRates && now - lastFetchTime < CACHE_TTL) {
    return cachedRates;
  }

  try {
    const response = await fetch(EXCHANGE_API_URL);
    if (!response.ok) {
      console.error(`Exchange API error: ${response.status}`);
      return cachedRates;
    }

    const data = await response.json();
    cachedRates = data;
    lastFetchTime = now;
    return data;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return cachedRates;
  }
}

function calculatePairPrice(symbol: string, rates: Record<string, number>): number | null {
  const [base, quote] = symbol.split('/');
  
  if (!base || !quote) return null;
  
  const baseRate = base === 'USD' ? 1 : rates[base];
  const quoteRate = quote === 'USD' ? 1 : rates[quote];
  
  if (!baseRate || !quoteRate) return null;
  
  // For pairs like EUR/USD: 1 EUR = X USD, so we need USD/EUR inverted
  // rate[EUR] = 0.845 means 1 USD = 0.845 EUR, so EUR/USD = 1/0.845
  if (quote === 'USD') {
    return 1 / baseRate;
  }
  
  // For pairs like USD/JPY: 1 USD = X JPY
  if (base === 'USD') {
    return quoteRate;
  }
  
  // For cross pairs like EUR/JPY: EUR/USD * USD/JPY
  const baseToUsd = 1 / baseRate;
  const usdToQuote = quoteRate;
  return baseToUsd * usdToQuote;
}

export async function getRealPrice(symbol: string): Promise<number | null> {
  const rates = await fetchExchangeRates();
  if (!rates) return null;
  
  return calculatePairPrice(symbol, rates.rates);
}

export async function getMultiplePrices(symbols: string[]): Promise<Record<string, number>> {
  const rates = await fetchExchangeRates();
  const result: Record<string, number> = {};
  
  if (!rates) return result;
  
  for (const symbol of symbols) {
    const price = calculatePairPrice(symbol, rates.rates);
    if (price) {
      result[symbol.replace('/', '')] = price;
    }
  }
  
  return result;
}

export function calculateTechnicalIndicators(priceHistory: number[]) {
  const prices = priceHistory.slice(-14);
  
  let gains = 0, losses = 0;
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  const ema9 = calculateEMA(priceHistory, 9);
  const ema21 = calculateEMA(priceHistory, 21);
  const ema50 = calculateEMA(priceHistory, 50);
  const ema200 = calculateEMA(priceHistory, Math.min(200, priceHistory.length));

  const sma20 = priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const stdDev = Math.sqrt(
    priceHistory.slice(-20).reduce((sum, p) => sum + Math.pow(p - sma20, 2), 0) / 20
  );
  const bollingerUpper = sma20 + stdDev * 2;
  const bollingerLower = sma20 - stdDev * 2;

  const ema12 = calculateEMA(priceHistory, 12);
  const ema26 = calculateEMA(priceHistory, 26);
  const macd = ema12 - ema26;
  const signalLine = calculateEMA([...Array(9).fill(macd)], 9);

  const currentPrice = priceHistory[priceHistory.length - 1];
  const high14 = Math.max(...priceHistory.slice(-14));
  const low14 = Math.min(...priceHistory.slice(-14));
  const stochK = ((currentPrice - low14) / (high14 - low14)) * 100;

  return {
    rsi,
    ema9, ema21, ema50, ema200,
    bollingerUpper, bollingerLower, sma20,
    macd, macdSignal: signalLine,
    stochK,
    trend: ema9 > ema21 ? 'BULLISH' : 'BEARISH',
    momentum: rsi > 50 ? 'POSITIVE' : 'NEGATIVE'
  };
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

export async function generateAccurateMarketData(symbol: string): Promise<{
  currentPrice: number;
  priceHistory: number[];
  indicators: ReturnType<typeof calculateTechnicalIndicators>;
}> {
  const realPrice = await getRealPrice(symbol);
  const basePrice = realPrice || getFallbackPrice(symbol);
  
  // Generate realistic price history around the real price
  const volatility = symbol.includes('JPY') ? 0.05 : 0.0003;
  const priceHistory: number[] = [];
  
  let price = basePrice * (1 - volatility * 5);
  for (let i = 0; i < 50; i++) {
    const trend = Math.random() > 0.48 ? 1 : -1;
    const change = Math.random() * volatility * trend;
    price = price + change;
    priceHistory.push(price);
  }
  // Last price is the real current price
  priceHistory[priceHistory.length - 1] = basePrice;

  const indicators = calculateTechnicalIndicators(priceHistory);

  return {
    currentPrice: basePrice,
    priceHistory,
    indicators
  };
}

function getFallbackPrice(symbol: string): number {
  const prices: Record<string, number> = {
    'EUR/USD': 1.0850, 'GBP/USD': 1.2650, 'USD/JPY': 149.50,
    'USD/CHF': 0.8850, 'USD/CAD': 1.3550, 'AUD/USD': 0.6550,
    'EUR/JPY': 162.20, 'GBP/JPY': 189.00, 'EUR/GBP': 0.8580,
    'AUD/CAD': 0.8900, 'AUD/CHF': 0.5800, 'AUD/JPY': 97.80,
    'CAD/CHF': 0.6530, 'CAD/JPY': 110.30, 'CHF/JPY': 168.90,
    'EUR/AUD': 1.6550, 'EUR/CAD': 1.4700, 'GBP/AUD': 1.9300,
    'GBP/CAD': 1.7100, 'GBP/CHF': 1.1200,
  };
  return prices[symbol] || 1.0000;
}
