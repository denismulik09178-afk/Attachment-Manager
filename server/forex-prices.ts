// Primary: fawazahmed0 API (NO RATE LIMITS!)
const FAWAZ_API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';
// Backup: exchangerate-api
const BACKUP_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

interface ExchangeRates {
  rates: Record<string, number>;
  time_last_updated: number;
}

let cachedRates: ExchangeRates | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds cache

// Store real price history for each pair
const priceHistoryCache: Record<string, { prices: number[], lastUpdate: number }> = {};

async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  const now = Date.now();
  
  if (cachedRates && now - lastFetchTime < CACHE_TTL) {
    return cachedRates;
  }

  try {
    // Try fawazahmed0 API first (NO LIMITS!)
    const response = await fetch(FAWAZ_API_URL);
    if (response.ok) {
      const data = await response.json();
      // Convert format: { usd: { eur: 0.92, ... } } -> { rates: { EUR: 0.92, ... } }
      const rates: Record<string, number> = {};
      if (data.usd) {
        for (const [currency, rate] of Object.entries(data.usd)) {
          rates[currency.toUpperCase()] = rate as number;
        }
      }
      cachedRates = { rates, time_last_updated: now };
      lastFetchTime = now;
      console.log('[Forex] Fetched rates from fawazahmed0 API');
      return cachedRates;
    }
  } catch (error) {
    console.error('Fawaz API failed, trying backup:', error);
  }

  try {
    // Backup API
    const response = await fetch(BACKUP_API_URL);
    if (!response.ok) {
      console.error(`Backup API error: ${response.status}`);
      return cachedRates;
    }

    const data = await response.json();
    cachedRates = data;
    lastFetchTime = now;
    console.log('[Forex] Fetched rates from backup API');
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
  
  const basePrice = calculatePairPrice(symbol, rates.rates);
  if (!basePrice) return null;
  
  // Add realistic micro-fluctuation (pip movement)
  // This simulates real market tick movements between API updates
  const isJpy = symbol.includes('JPY');
  const pipValue = isJpy ? 0.01 : 0.0001;
  const maxPips = 5; // Up to 5 pips movement
  const fluctuation = (Math.random() - 0.5) * 2 * maxPips * pipValue;
  
  return basePrice + fluctuation;
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
  const currentPrice = priceHistory[priceHistory.length - 1];
  
  // === RSI (Relative Strength Index) ===
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

  // === EMAs (Exponential Moving Averages) ===
  const ema9 = calculateEMA(priceHistory, 9);
  const ema21 = calculateEMA(priceHistory, 21);
  const ema50 = calculateEMA(priceHistory, 50);
  const ema200 = calculateEMA(priceHistory, Math.min(200, priceHistory.length));

  // === SMAs (Simple Moving Averages) ===
  const sma10 = priceHistory.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, priceHistory.length);
  const sma20 = priceHistory.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, priceHistory.length);
  const sma50 = priceHistory.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, priceHistory.length);

  // === Bollinger Bands ===
  const stdDev = Math.sqrt(
    priceHistory.slice(-20).reduce((sum, p) => sum + Math.pow(p - sma20, 2), 0) / 20
  );
  const bollingerUpper = sma20 + stdDev * 2;
  const bollingerLower = sma20 - stdDev * 2;
  const bollingerWidth = (bollingerUpper - bollingerLower) / sma20 * 100;

  // === MACD ===
  const ema12 = calculateEMA(priceHistory, 12);
  const ema26 = calculateEMA(priceHistory, 26);
  const macd = ema12 - ema26;
  const macdSignal = calculateEMA([...Array(9).fill(macd)], 9);
  const macdHistogram = macd - macdSignal;

  // === Stochastic Oscillator ===
  const high14 = Math.max(...priceHistory.slice(-14));
  const low14 = Math.min(...priceHistory.slice(-14));
  const stochK = high14 !== low14 ? ((currentPrice - low14) / (high14 - low14)) * 100 : 50;
  const stochD = stochK; // Simplified D line

  // === Williams %R ===
  const williamsR = high14 !== low14 ? ((high14 - currentPrice) / (high14 - low14)) * -100 : -50;

  // === CCI (Commodity Channel Index) ===
  const typicalPrice = currentPrice;
  const meanDeviation = priceHistory.slice(-20).reduce((sum, p) => sum + Math.abs(p - sma20), 0) / 20;
  const cci = meanDeviation !== 0 ? (typicalPrice - sma20) / (0.015 * meanDeviation) : 0;

  // === ADX (Average Directional Index) - simplified ===
  let plusDM = 0, minusDM = 0, tr = 0;
  for (let i = 1; i < Math.min(14, priceHistory.length); i++) {
    const high = priceHistory[i];
    const low = priceHistory[i - 1];
    const prevHigh = i > 1 ? priceHistory[i - 1] : high;
    const prevLow = i > 1 ? priceHistory[i - 2] : low;
    
    const upMove = high - prevHigh;
    const downMove = prevLow - low;
    
    if (upMove > downMove && upMove > 0) plusDM += upMove;
    if (downMove > upMove && downMove > 0) minusDM += downMove;
    tr += Math.abs(high - low);
  }
  const plusDI = tr !== 0 ? (plusDM / tr) * 100 : 0;
  const minusDI = tr !== 0 ? (minusDM / tr) * 100 : 0;
  const dx = (plusDI + minusDI) !== 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;
  const adx = dx;

  // === ATR (Average True Range) ===
  let atrSum = 0;
  for (let i = 1; i < Math.min(14, priceHistory.length); i++) {
    atrSum += Math.abs(priceHistory[i] - priceHistory[i - 1]);
  }
  const atr = atrSum / Math.min(13, priceHistory.length - 1);

  // === ROC (Rate of Change) ===
  const roc = priceHistory.length > 10 
    ? ((currentPrice - priceHistory[priceHistory.length - 10]) / priceHistory[priceHistory.length - 10]) * 100 
    : 0;

  // === MFI-like momentum (Money Flow Index simplified) ===
  let positiveFlow = 0, negativeFlow = 0;
  for (let i = 1; i < Math.min(14, priceHistory.length); i++) {
    const change = priceHistory[i] - priceHistory[i - 1];
    if (change > 0) positiveFlow += priceHistory[i];
    else negativeFlow += priceHistory[i];
  }
  const mfi = (positiveFlow + negativeFlow) !== 0 
    ? (positiveFlow / (positiveFlow + negativeFlow)) * 100 
    : 50;

  // === Ultimate Oscillator ===
  const bp7 = currentPrice - Math.min(...priceHistory.slice(-7));
  const tr7 = Math.max(...priceHistory.slice(-7)) - Math.min(...priceHistory.slice(-7));
  const bp14 = currentPrice - Math.min(...priceHistory.slice(-14));
  const tr14 = Math.max(...priceHistory.slice(-14)) - Math.min(...priceHistory.slice(-14));
  const bp28 = currentPrice - Math.min(...priceHistory.slice(-28));
  const tr28 = Math.max(...priceHistory.slice(-28)) - Math.min(...priceHistory.slice(-28));
  const uo = tr7 && tr14 && tr28 
    ? ((4 * bp7/tr7 + 2 * bp14/tr14 + bp28/tr28) / 7) * 100 
    : 50;

  // === Pivot Points ===
  const pivotHigh = Math.max(...priceHistory.slice(-5));
  const pivotLow = Math.min(...priceHistory.slice(-5));
  const pivotPoint = (pivotHigh + pivotLow + currentPrice) / 3;
  const support1 = 2 * pivotPoint - pivotHigh;
  const resistance1 = 2 * pivotPoint - pivotLow;
  const support2 = pivotPoint - (pivotHigh - pivotLow);
  const resistance2 = pivotPoint + (pivotHigh - pivotLow);

  // === VWAP-like (Volume Weighted Average Price approximation) ===
  const vwap = priceHistory.slice(-20).reduce((sum, p, i) => sum + p * (i + 1), 0) / 
               priceHistory.slice(-20).reduce((sum, _, i) => sum + (i + 1), 0);

  // === Keltner Channel ===
  const keltnerMiddle = ema21;
  const keltnerUpper = keltnerMiddle + atr * 2;
  const keltnerLower = keltnerMiddle - atr * 2;

  // === Donchian Channel ===
  const donchianHigh = Math.max(...priceHistory.slice(-20));
  const donchianLow = Math.min(...priceHistory.slice(-20));
  const donchianMiddle = (donchianHigh + donchianLow) / 2;

  // === Ichimoku Cloud (simplified) ===
  const tenkanSen = (Math.max(...priceHistory.slice(-9)) + Math.min(...priceHistory.slice(-9))) / 2;
  const kijunSen = (Math.max(...priceHistory.slice(-26)) + Math.min(...priceHistory.slice(-26))) / 2;
  const senkouSpanA = (tenkanSen + kijunSen) / 2;
  const senkouSpanB = (Math.max(...priceHistory.slice(-52)) + Math.min(...priceHistory.slice(-52))) / 2;

  // === Parabolic SAR approximation ===
  const sarUp = currentPrice > ema9;
  const sarAcceleration = sarUp ? 0.02 : -0.02;

  // === Chaikin Money Flow (CMF) approximation ===
  let cmfSum = 0;
  for (let i = Math.max(0, priceHistory.length - 20); i < priceHistory.length; i++) {
    const high = priceHistory[i];
    const low = i > 0 ? priceHistory[i - 1] : high;
    const close = priceHistory[i];
    const mfm = (high - low) !== 0 ? ((close - low) - (high - close)) / (high - low) : 0;
    cmfSum += mfm;
  }
  const cmf = cmfSum / 20;

  // === Aroon Indicator ===
  const last25 = priceHistory.slice(-25);
  const aroonUpIdx = last25.indexOf(Math.max(...last25));
  const aroonDownIdx = last25.indexOf(Math.min(...last25));
  const aroonUp = ((25 - (24 - aroonUpIdx)) / 25) * 100;
  const aroonDown = ((25 - (24 - aroonDownIdx)) / 25) * 100;
  const aroonOsc = aroonUp - aroonDown;

  // === TRIX (Triple Exponential Average) ===
  const ema1 = calculateEMA(priceHistory, 15);
  const trix = ((ema9 - ema1) / ema1) * 100;

  // === Price Position relative to channels ===
  const pricePositionBB = (currentPrice - bollingerLower) / (bollingerUpper - bollingerLower) * 100;
  const pricePositionKeltner = (currentPrice - keltnerLower) / (keltnerUpper - keltnerLower) * 100;
  const pricePositionDonchian = (currentPrice - donchianLow) / (donchianHigh - donchianLow) * 100;

  // === Trend Strength ===
  const shortTrend = ema9 > ema21 ? 1 : -1;
  const mediumTrend = ema21 > ema50 ? 1 : -1;
  const longTrend = currentPrice > ema200 ? 1 : -1;
  const trendStrength = shortTrend + mediumTrend + longTrend; // -3 to +3

  // === Volume-like Momentum ===
  const priceChanges = [];
  for (let i = 1; i < priceHistory.length; i++) {
    priceChanges.push(Math.abs(priceHistory[i] - priceHistory[i - 1]));
  }
  const avgChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
  const recentChange = priceChanges.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const volumeMomentum = avgChange !== 0 ? recentChange / avgChange : 1;

  return {
    // Core indicators
    rsi,
    ema9, ema21, ema50, ema200,
    sma10, sma20, sma50,
    bollingerUpper, bollingerLower, bollingerWidth,
    macd, macdSignal, macdHistogram,
    
    // Oscillators
    stochK, stochD,
    williamsR,
    cci,
    mfi,
    uo, // Ultimate Oscillator
    
    // Trend indicators
    adx, plusDI, minusDI,
    atr,
    roc,
    trendStrength,
    
    // Pivot levels
    pivotPoint, support1, resistance1, support2, resistance2,
    
    // Momentum
    volumeMomentum,
    
    // NEW: Channels
    vwap,
    keltnerUpper, keltnerLower, keltnerMiddle,
    donchianHigh, donchianLow, donchianMiddle,
    
    // NEW: Ichimoku
    tenkanSen, kijunSen, senkouSpanA, senkouSpanB,
    
    // NEW: Additional
    cmf, // Chaikin Money Flow
    aroonUp, aroonDown, aroonOsc,
    trix,
    pricePositionBB, pricePositionKeltner, pricePositionDonchian,
    sarUp,
    
    // Summary
    trend: trendStrength > 0 ? 'BULLISH' : trendStrength < 0 ? 'BEARISH' : 'NEUTRAL',
    momentum: rsi > 50 ? 'POSITIVE' : 'NEGATIVE',
    strength: adx > 25 ? 'STRONG' : 'WEAK'
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
  
  const now = Date.now();
  const cacheKey = symbol.replace('/', '');
  
  // Initialize or update price history cache with REAL prices
  if (!priceHistoryCache[cacheKey]) {
    priceHistoryCache[cacheKey] = { prices: [], lastUpdate: 0 };
  }
  
  const cache = priceHistoryCache[cacheKey];
  
  // Add new price every 10 seconds (building real history)
  if (now - cache.lastUpdate > 10000 || cache.prices.length === 0) {
    cache.prices.push(basePrice);
    cache.lastUpdate = now;
    
    // Keep only last 100 prices
    if (cache.prices.length > 100) {
      cache.prices.shift();
    }
  }
  
  let priceHistory: number[];
  
  // If we have enough real history, use it!
  if (cache.prices.length >= 20) {
    priceHistory = [...cache.prices];
    console.log(`[${symbol}] Using REAL price history: ${cache.prices.length} points`);
  } else {
    // Not enough real data yet - generate balanced simulation
    const volatility = symbol.includes('JPY') ? 0.02 : 0.0001;
    priceHistory = [];
    
    // Start from a random position (not always below current price)
    const marketCondition = Math.random();
    let startPrice: number;
    let trendBias: number;
    
    if (marketCondition < 0.33) {
      // Price was higher before (downtrend to current = RSI low = UP signal)
      startPrice = basePrice * (1 + volatility * 20);
      trendBias = 0.4; // More down moves
    } else if (marketCondition < 0.66) {
      // Price was lower before (uptrend to current = RSI high = DOWN signal)
      startPrice = basePrice * (1 - volatility * 20);
      trendBias = 0.6; // More up moves
    } else {
      // Sideways
      startPrice = basePrice;
      trendBias = 0.5;
    }
    
    let price = startPrice;
    for (let i = 0; i < 49; i++) {
      const trend = Math.random() < trendBias ? 1 : -1;
      const change = Math.random() * volatility * trend;
      price = price + change;
      priceHistory.push(price);
    }
    priceHistory.push(basePrice); // Last = current real price
    
    console.log(`[${symbol}] Simulated history (condition: ${marketCondition < 0.33 ? 'BEARISH' : marketCondition < 0.66 ? 'BULLISH' : 'NEUTRAL'})`);
  }

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
