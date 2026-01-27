// Smart Money Concepts (SMC) Advanced Analysis Module
// Includes: Market Structure, Liquidity, Multi-Timeframe, Sessions, Confluence Scoring

const TRADINGVIEW_API_URL = 'https://scanner.tradingview.com/forex/scan';

// ========== TYPES ==========

export interface OHLCVData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  change?: number;
  changePercent?: number;
}

export interface MarketStructure {
  trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  lastSwingHigh: number | null;
  lastSwingLow: number | null;
  higherHigh: boolean;
  higherLow: boolean;
  lowerHigh: boolean;
  lowerLow: boolean;
  bos: 'BULLISH_BOS' | 'BEARISH_BOS' | null; // Break of Structure
  choch: 'BULLISH_CHOCH' | 'BEARISH_CHOCH' | null; // Change of Character
  structureDescription: string;
}

export interface LiquidityZones {
  equalHighs: boolean;
  equalLows: boolean;
  prevDayHigh: number | null;
  prevDayLow: number | null;
  sessionHigh: number | null;
  sessionLow: number | null;
  fvgBullish: boolean; // Fair Value Gap
  fvgBearish: boolean;
  premiumZone: boolean; // Price in premium (above 50% of range)
  discountZone: boolean; // Price in discount (below 50% of range)
  liquiditySweep: 'HIGH_SWEPT' | 'LOW_SWEPT' | null;
  liquidityDescription: string;
}

export interface TradingSession {
  current: 'ASIA' | 'LONDON' | 'NEW_YORK' | 'OVERLAP' | 'OFF_HOURS';
  isActive: boolean;
  sessionStart: string;
  sessionEnd: string;
  description: string;
}

export interface Filters {
  htfTrendAligned: boolean; // Higher timeframe trend alignment
  atrValid: boolean; // ATR filter passed
  spreadOk: boolean; // Spread acceptable
  isRanging: boolean; // Flat/Range detected
  sessionAllowed: boolean; // Trading session filter
  newsRisk: boolean; // Potential news risk
  allFiltersPassed: boolean;
  filterDescription: string;
}

export interface EntryTiming {
  breakRetest: boolean;
  impulsePullback: boolean;
  rejectionCandle: boolean;
  fakeBreakout: boolean;
  entryType: string | null;
  entryDescription: string;
}

export interface Indicators {
  // Core
  close: number;
  open: number;
  high: number;
  low: number;
  
  // EMAs
  ema20: number;
  ema50: number;
  ema200: number;
  
  // RSI
  rsi: number;
  rsiPrev: number;
  
  // ATR
  atr: number;
  atrPercent: number;
  
  // Bollinger Bands
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbWidth: number;
  bbPosition: number; // 0-1, position within bands
  
  // MACD
  macd: number;
  macdSignal: number;
  macdHist: number;
  
  // Stochastic
  stochK: number;
  stochD: number;
  
  // CCI
  cci: number;
  
  // ADX
  adx: number;
  adxPlus: number;
  adxMinus: number;
  
  // Volume
  volume: number;
  volumeChange: number;
  
  // TradingView Recommendations
  recommendAll: number;
  recommendMA: number;
  recommendOsc: number;
}

export interface TimeframeAnalysis {
  timeframe: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  strength: number;
  indicators: Partial<Indicators>;
}

export interface ConfluenceScore {
  total: number; // 0-100
  indicatorScore: number;
  structureScore: number;
  liquidityScore: number;
  timingScore: number;
  sessionScore: number;
  breakdown: string[];
}

export interface SMCAnalysisResult {
  symbol: string;
  timeframe: number;
  timestamp: Date;
  
  // Core data
  ohlcv: OHLCVData;
  indicators: Indicators;
  
  // Multi-timeframe
  mtfAnalysis: TimeframeAnalysis[];
  htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  
  // SMC Components
  marketStructure: MarketStructure;
  liquidity: LiquidityZones;
  session: TradingSession;
  filters: Filters;
  entryTiming: EntryTiming;
  
  // AI Decision Support
  confluence: ConfluenceScore;
  finalDirection: 'UP' | 'DOWN' | null;
  confidence: number;
  shouldTrade: boolean;
  skipReason: string | null;
  
  // Summary for AI
  aiSummary: string;
}

// ========== HELPER FUNCTIONS ==========

function getTimeframeInterval(minutes: number): string {
  if (minutes <= 1) return '1';
  if (minutes <= 5) return '5';
  if (minutes <= 15) return '15';
  if (minutes <= 30) return '30';
  if (minutes <= 60) return '60';
  if (minutes <= 240) return '240';
  return '1D';
}

function getCurrentSession(): TradingSession {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // Session times in UTC
  // Asia: 00:00 - 09:00 UTC (Tokyo/Sydney)
  // London: 07:00 - 16:00 UTC
  // New York: 12:00 - 21:00 UTC
  // Overlap London/NY: 12:00 - 16:00 UTC
  
  let session: TradingSession['current'] = 'OFF_HOURS';
  let isActive = false;
  let sessionStart = '';
  let sessionEnd = '';
  let description = '';
  
  if (utcHour >= 0 && utcHour < 9) {
    session = 'ASIA';
    isActive = true;
    sessionStart = '00:00';
    sessionEnd = '09:00';
    description = 'Азійська сесія (Токіо/Сідней) - помірна волатильність';
  } else if (utcHour >= 12 && utcHour < 16) {
    session = 'OVERLAP';
    isActive = true;
    sessionStart = '12:00';
    sessionEnd = '16:00';
    description = 'Перекриття Лондон/Нью-Йорк - МАКСИМАЛЬНА волатильність';
  } else if (utcHour >= 7 && utcHour < 16) {
    session = 'LONDON';
    isActive = true;
    sessionStart = '07:00';
    sessionEnd = '16:00';
    description = 'Лондонська сесія - висока волатильність';
  } else if (utcHour >= 12 && utcHour < 21) {
    session = 'NEW_YORK';
    isActive = true;
    sessionStart = '12:00';
    sessionEnd = '21:00';
    description = 'Нью-Йоркська сесія - висока волатильність';
  } else {
    session = 'OFF_HOURS';
    isActive = false;
    description = 'Поза торговими сесіями - низька ліквідність';
  }
  
  return { current: session, isActive, sessionStart, sessionEnd, description };
}

function analyzeMarketStructure(
  close: number,
  high: number,
  low: number,
  ema20: number,
  ema50: number,
  ema200: number,
  prevHigh: number | null,
  prevLow: number | null
): MarketStructure {
  // Simplified structure analysis based on EMAs and price action
  const aboveEma20 = close > ema20;
  const aboveEma50 = close > ema50;
  const aboveEma200 = close > ema200;
  const ema20AboveEma50 = ema20 > ema50;
  const ema50AboveEma200 = ema50 > ema200;
  
  // Determine trend
  let trend: MarketStructure['trend'] = 'RANGING';
  if (aboveEma200 && ema20AboveEma50 && ema50AboveEma200) {
    trend = 'BULLISH';
  } else if (!aboveEma200 && !ema20AboveEma50 && !ema50AboveEma200) {
    trend = 'BEARISH';
  }
  
  // HH/HL/LH/LL detection (simplified)
  const higherHigh = prevHigh !== null && high > prevHigh;
  const higherLow = prevLow !== null && low > prevLow;
  const lowerHigh = prevHigh !== null && high < prevHigh;
  const lowerLow = prevLow !== null && low < prevLow;
  
  // BOS detection
  let bos: MarketStructure['bos'] = null;
  if (trend === 'BULLISH' && higherHigh) {
    bos = 'BULLISH_BOS';
  } else if (trend === 'BEARISH' && lowerLow) {
    bos = 'BEARISH_BOS';
  }
  
  // CHOCH detection (trend reversal signal)
  let choch: MarketStructure['choch'] = null;
  if (trend === 'BEARISH' && higherHigh && higherLow) {
    choch = 'BULLISH_CHOCH';
  } else if (trend === 'BULLISH' && lowerHigh && lowerLow) {
    choch = 'BEARISH_CHOCH';
  }
  
  let structureDescription = '';
  if (trend === 'BULLISH') {
    structureDescription = `БИЧАЧИЙ тренд: ціна вище EMA200, ${higherHigh ? 'HH' : ''} ${higherLow ? 'HL' : ''} структура`;
  } else if (trend === 'BEARISH') {
    structureDescription = `ВЕДМЕЖИЙ тренд: ціна нижче EMA200, ${lowerHigh ? 'LH' : ''} ${lowerLow ? 'LL' : ''} структура`;
  } else {
    structureDescription = 'КОНСОЛІДАЦІЯ: немає чіткого тренду, очікуємо BOS';
  }
  
  if (bos) {
    structureDescription += ` | BOS ${bos === 'BULLISH_BOS' ? 'вгору' : 'вниз'}`;
  }
  if (choch) {
    structureDescription += ` | CHOCH ${choch === 'BULLISH_CHOCH' ? 'розворот вгору' : 'розворот вниз'}`;
  }
  
  return {
    trend,
    lastSwingHigh: prevHigh,
    lastSwingLow: prevLow,
    higherHigh,
    higherLow,
    lowerHigh,
    lowerLow,
    bos,
    choch,
    structureDescription
  };
}

function analyzeLiquidity(
  close: number,
  high: number,
  low: number,
  bbUpper: number,
  bbLower: number,
  prevDayHigh: number | null,
  prevDayLow: number | null
): LiquidityZones {
  // Calculate range and zones
  const range = high - low;
  const midpoint = (high + low) / 2;
  
  // Premium/Discount zones
  const premiumZone = close > midpoint;
  const discountZone = close < midpoint;
  
  // Equal Highs/Lows detection (price near recent high/low)
  const tolerance = range * 0.1; // 10% tolerance
  const equalHighs = Math.abs(close - high) < tolerance;
  const equalLows = Math.abs(close - low) < tolerance;
  
  // FVG detection (simplified - based on BB position)
  const bbRange = bbUpper - bbLower;
  const fvgBullish = close < bbLower + bbRange * 0.2; // Near lower BB
  const fvgBearish = close > bbUpper - bbRange * 0.2; // Near upper BB
  
  // Liquidity sweep detection
  let liquiditySweep: LiquidityZones['liquiditySweep'] = null;
  if (prevDayHigh && high > prevDayHigh && close < prevDayHigh) {
    liquiditySweep = 'HIGH_SWEPT';
  } else if (prevDayLow && low < prevDayLow && close > prevDayLow) {
    liquiditySweep = 'LOW_SWEPT';
  }
  
  let liquidityDescription = '';
  if (premiumZone) {
    liquidityDescription = 'PREMIUM зона (продаж переважає)';
  } else {
    liquidityDescription = 'DISCOUNT зона (купівля переважає)';
  }
  
  if (fvgBullish) liquidityDescription += ' | FVG бичачий';
  if (fvgBearish) liquidityDescription += ' | FVG ведмежий';
  if (liquiditySweep) {
    liquidityDescription += ` | Sweep ${liquiditySweep === 'HIGH_SWEPT' ? 'верху' : 'низу'}`;
  }
  
  return {
    equalHighs,
    equalLows,
    prevDayHigh,
    prevDayLow,
    sessionHigh: high,
    sessionLow: low,
    fvgBullish,
    fvgBearish,
    premiumZone,
    discountZone,
    liquiditySweep,
    liquidityDescription
  };
}

function analyzeFilters(
  atr: number,
  close: number,
  adx: number,
  session: TradingSession,
  htfBias: string,
  currentDirection: string | null
): Filters {
  // ATR filter - volatility check
  const atrPercent = (atr / close) * 100;
  const atrValid = atrPercent >= 0.05 && atrPercent <= 2.0; // Reasonable volatility
  
  // Spread filter (simplified - assume OK for major pairs)
  const spreadOk = true;
  
  // Range/Flat detection
  const isRanging = adx < 20;
  
  // Session filter
  const sessionAllowed = session.isActive && session.current !== 'ASIA';
  
  // HTF alignment
  const htfTrendAligned = currentDirection === htfBias || htfBias === 'NEUTRAL';
  
  // News risk (simplified - could integrate news API)
  const newsRisk = false;
  
  const allFiltersPassed = atrValid && spreadOk && !isRanging && sessionAllowed && htfTrendAligned && !newsRisk;
  
  let filterDescription = '';
  if (!allFiltersPassed) {
    const issues = [];
    if (!atrValid) issues.push(`ATR ${atrPercent.toFixed(2)}% поза нормою`);
    if (isRanging) issues.push(`ADX ${adx.toFixed(0)} - флет`);
    if (!sessionAllowed) issues.push(`сесія ${session.current} не рекомендована`);
    if (!htfTrendAligned) issues.push('HTF не підтверджує');
    filterDescription = `ФІЛЬТРИ НЕ ПРОЙДЕНО: ${issues.join(', ')}`;
  } else {
    filterDescription = `ВСІ ФІЛЬТРИ OK: ATR ${atrPercent.toFixed(2)}%, ADX ${adx.toFixed(0)}, ${session.current}`;
  }
  
  return {
    htfTrendAligned,
    atrValid,
    spreadOk,
    isRanging,
    sessionAllowed,
    newsRisk,
    allFiltersPassed,
    filterDescription
  };
}

function analyzeEntryTiming(
  close: number,
  open: number,
  high: number,
  low: number,
  ema20: number,
  rsi: number,
  rsiPrev: number,
  stochK: number,
  stochD: number,
  direction: 'UP' | 'DOWN' | null
): EntryTiming {
  // Break + Retest detection
  const breakRetest = direction === 'UP' 
    ? (close > ema20 && low <= ema20 * 1.001) // Touched and bounced from EMA20
    : (close < ema20 && high >= ema20 * 0.999);
  
  // Impulse → Pullback
  const momentum = rsi - rsiPrev;
  const impulsePullback = direction === 'UP'
    ? (momentum > 5 && rsi > 50 && rsi < 70)
    : (momentum < -5 && rsi < 50 && rsi > 30);
  
  // Rejection Candle
  const bodySize = Math.abs(close - open);
  const totalRange = high - low;
  const wickRatio = totalRange > 0 ? (totalRange - bodySize) / totalRange : 0;
  const rejectionCandle = wickRatio > 0.6; // Long wicks
  
  // Fake Breakout detection
  const fakeBreakout = direction === 'UP'
    ? (high > ema20 * 1.002 && close < ema20)
    : (low < ema20 * 0.998 && close > ema20);
  
  let entryType: string | null = null;
  let entryDescription = '';
  
  if (breakRetest) {
    entryType = 'BREAK_RETEST';
    entryDescription = 'Break + Retest EMA20 - класичний вхід';
  } else if (impulsePullback) {
    entryType = 'IMPULSE_PULLBACK';
    entryDescription = 'Impulse → Pullback - продовження тренду';
  } else if (rejectionCandle && !fakeBreakout) {
    entryType = 'REJECTION';
    entryDescription = 'Rejection Candle - розворотний сигнал';
  } else if (fakeBreakout) {
    entryDescription = 'УВАГА: Fake Breakout detected - пастка';
  } else {
    entryDescription = 'Немає чіткого патерну входу';
  }
  
  return {
    breakRetest,
    impulsePullback,
    rejectionCandle,
    fakeBreakout,
    entryType,
    entryDescription
  };
}

function calculateConfluence(
  indicators: Indicators,
  structure: MarketStructure,
  liquidity: LiquidityZones,
  timing: EntryTiming,
  session: TradingSession,
  filters: Filters,
  direction: 'UP' | 'DOWN' | null
): ConfluenceScore {
  const breakdown: string[] = [];
  let indicatorScore = 0;
  let structureScore = 0;
  let liquidityScore = 0;
  let timingScore = 0;
  let sessionScore = 0;
  
  // INDICATOR SCORE (max 30)
  if (direction === 'UP') {
    if (indicators.rsi > 40 && indicators.rsi < 70) { indicatorScore += 5; breakdown.push('RSI бичача зона'); }
    if (indicators.macd > indicators.macdSignal) { indicatorScore += 5; breakdown.push('MACD бичачий'); }
    if (indicators.stochK > indicators.stochD) { indicatorScore += 5; breakdown.push('Stoch бичачий'); }
    if (indicators.cci > 0) { indicatorScore += 3; breakdown.push('CCI позитивний'); }
    if (indicators.recommendAll > 0.2) { indicatorScore += 7; breakdown.push(`TV ${(indicators.recommendAll*100).toFixed(0)}% BUY`); }
    if (indicators.adxPlus > indicators.adxMinus && indicators.adx > 22) { indicatorScore += 5; breakdown.push('ADX тренд UP'); }
  } else if (direction === 'DOWN') {
    if (indicators.rsi > 30 && indicators.rsi < 60) { indicatorScore += 5; breakdown.push('RSI ведмежа зона'); }
    if (indicators.macd < indicators.macdSignal) { indicatorScore += 5; breakdown.push('MACD ведмежий'); }
    if (indicators.stochK < indicators.stochD) { indicatorScore += 5; breakdown.push('Stoch ведмежий'); }
    if (indicators.cci < 0) { indicatorScore += 3; breakdown.push('CCI негативний'); }
    if (indicators.recommendAll < -0.2) { indicatorScore += 7; breakdown.push(`TV ${(indicators.recommendAll*100).toFixed(0)}% SELL`); }
    if (indicators.adxMinus > indicators.adxPlus && indicators.adx > 22) { indicatorScore += 5; breakdown.push('ADX тренд DOWN'); }
  }
  
  // STRUCTURE SCORE (max 25)
  if (direction === 'UP' && structure.trend === 'BULLISH') { structureScore += 10; breakdown.push('Структура БИЧАЧА'); }
  if (direction === 'DOWN' && structure.trend === 'BEARISH') { structureScore += 10; breakdown.push('Структура ВЕДМЕЖА'); }
  if (structure.bos) { structureScore += 8; breakdown.push('BOS підтверджено'); }
  if (structure.choch) { structureScore += 7; breakdown.push('CHOCH сигнал'); }
  if (structure.higherHigh && direction === 'UP') { structureScore += 5; }
  if (structure.lowerLow && direction === 'DOWN') { structureScore += 5; }
  
  // LIQUIDITY SCORE (max 20)
  if (direction === 'UP' && liquidity.discountZone) { liquidityScore += 8; breakdown.push('DISCOUNT зона'); }
  if (direction === 'DOWN' && liquidity.premiumZone) { liquidityScore += 8; breakdown.push('PREMIUM зона'); }
  if (direction === 'UP' && liquidity.fvgBullish) { liquidityScore += 6; breakdown.push('FVG бичачий'); }
  if (direction === 'DOWN' && liquidity.fvgBearish) { liquidityScore += 6; breakdown.push('FVG ведмежий'); }
  if (liquidity.liquiditySweep) { liquidityScore += 6; breakdown.push('Liquidity Sweep'); }
  
  // TIMING SCORE (max 15)
  if (timing.entryType === 'BREAK_RETEST') { timingScore += 15; breakdown.push('Break+Retest'); }
  else if (timing.entryType === 'IMPULSE_PULLBACK') { timingScore += 12; breakdown.push('Impulse Pullback'); }
  else if (timing.entryType === 'REJECTION') { timingScore += 10; breakdown.push('Rejection Candle'); }
  if (timing.fakeBreakout) { timingScore -= 10; breakdown.push('FAKE BREAKOUT -10'); }
  
  // SESSION SCORE (max 10)
  if (session.current === 'OVERLAP') { sessionScore += 10; breakdown.push('Overlap сесія'); }
  else if (session.current === 'LONDON' || session.current === 'NEW_YORK') { sessionScore += 7; breakdown.push(`${session.current} сесія`); }
  else if (session.current === 'ASIA') { sessionScore += 3; breakdown.push('Asia сесія'); }
  
  // No penalties - simplified system
  
  const total = Math.min(100, Math.max(0, indicatorScore + structureScore + liquidityScore + timingScore + sessionScore));
  
  return {
    total,
    indicatorScore: Math.min(30, indicatorScore),
    structureScore: Math.min(25, structureScore),
    liquidityScore: Math.min(20, liquidityScore),
    timingScore: Math.min(15, Math.max(0, timingScore)),
    sessionScore: Math.min(10, sessionScore),
    breakdown
  };
}

// ========== MAIN ANALYSIS FUNCTION ==========

export async function getSMCAnalysis(
  symbol: string,
  timeframeMinutes: number
): Promise<SMCAnalysisResult> {
  const pair = symbol.replace('/', '');
  const interval = getTimeframeInterval(timeframeMinutes);
  const suffix = interval === '1D' ? '' : `|${interval}`;
  
  // Extended indicator columns for SMC analysis (verified available columns)
  const columns = [
    // OHLCV (0-3)
    `close${suffix}`, `open${suffix}`, `high${suffix}`, `low${suffix}`,
    // EMAs (4-6)
    `EMA20${suffix}`, `EMA50${suffix}`, `EMA200${suffix}`,
    // RSI (7-8)
    `RSI${suffix}`, `RSI[1]${suffix}`,
    // ATR (9)
    `ATR${suffix}`,
    // Bollinger Bands (10-12)
    `BB.upper${suffix}`, `BB.lower${suffix}`, `BB.basis${suffix}`,
    // MACD (13-14)
    `MACD.macd${suffix}`, `MACD.signal${suffix}`,
    // Stochastic (15-16)
    `Stoch.K${suffix}`, `Stoch.D${suffix}`,
    // CCI (17)
    `CCI20${suffix}`,
    // ADX (18-20)
    `ADX${suffix}`, `ADX+DI${suffix}`, `ADX-DI${suffix}`,
    // TradingView Recommendations (21-23)
    `Recommend.All${suffix}`, `Recommend.MA${suffix}`, `Recommend.Other${suffix}`,
    // Change (24)
    `change${suffix}`,
    // Previous period data for structure (25-26)
    `high[1]${suffix}`, `low[1]${suffix}`,
  ];
  
  try {
    const response = await fetch(TRADINGVIEW_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        symbols: { tickers: [`FX:${pair}`], query: { types: [] } },
        columns
      })
    });
    
    if (!response.ok) throw new Error(`TradingView API error: ${response.status}`);
    
    const data = await response.json();
    if (!data.data || data.data.length === 0) throw new Error('No data from TradingView');
    
    const v = data.data[0].d;
    
    // Parse indicators (matched to new column order)
    const indicators: Indicators = {
      close: v[0] ?? 0,
      open: v[1] ?? 0,
      high: v[2] ?? 0,
      low: v[3] ?? 0,
      volume: 0, // Not fetching volume for forex
      ema20: v[4] ?? 0,
      ema50: v[5] ?? 0,
      ema200: v[6] ?? 0,
      rsi: v[7] ?? 50,
      rsiPrev: v[8] ?? 50,
      atr: v[9] ?? 0,
      bbUpper: v[10] ?? 0,
      bbLower: v[11] ?? 0,
      bbMiddle: v[12] ?? 0,
      bbWidth: (v[10] ?? 0) - (v[11] ?? 0),
      bbPosition: v[10] && v[11] ? ((v[0] - v[11]) / ((v[10] - v[11]) || 1)) : 0.5,
      macd: v[13] ?? 0,
      macdSignal: v[14] ?? 0,
      macdHist: 0, // Not fetching separately
      stochK: v[15] ?? 50,
      stochD: v[16] ?? 50,
      cci: v[17] ?? 0,
      adx: v[18] ?? 0,
      adxPlus: v[19] ?? 0,
      adxMinus: v[20] ?? 0,
      recommendAll: v[21] ?? 0,
      recommendMA: v[22] ?? 0,
      recommendOsc: v[23] ?? 0,
      volumeChange: 0,
      atrPercent: ((v[9] ?? 0) / (v[0] ?? 1)) * 100
    };
    
    const prevHigh = v[25] ?? null;
    const prevLow = v[26] ?? null;
    
    // OHLCV
    const ohlcv: OHLCVData = {
      open: indicators.open,
      high: indicators.high,
      low: indicators.low,
      close: indicators.close,
      volume: indicators.volume,
      change: v[24] ?? 0,
      changePercent: (v[24] ?? 0) * 100
    };
    
    // Session
    const session = getCurrentSession();
    
    // Market Structure
    const marketStructure = analyzeMarketStructure(
      indicators.close, indicators.high, indicators.low,
      indicators.ema20, indicators.ema50, indicators.ema200,
      prevHigh, prevLow
    );
    
    // Liquidity
    const liquidity = analyzeLiquidity(
      indicators.close, indicators.high, indicators.low,
      indicators.bbUpper, indicators.bbLower,
      prevHigh, prevLow
    );
    
    // Determine initial direction - STRICT: need strong agreement
    let initialDirection: 'UP' | 'DOWN' | null = null;
    
    // Count confirmations (need 3+ out of 4 for direction)
    const bullishSignals = (indicators.recommendAll >= 0.3 ? 1 : 0) +
                           (indicators.macd > indicators.macdSignal ? 1 : 0) +
                           (indicators.rsi > 55 ? 1 : 0) +
                           (indicators.stochK > indicators.stochD && indicators.stochK > 50 ? 1 : 0);
    const bearishSignals = (indicators.recommendAll <= -0.3 ? 1 : 0) +
                           (indicators.macd < indicators.macdSignal ? 1 : 0) +
                           (indicators.rsi < 45 ? 1 : 0) +
                           (indicators.stochK < indicators.stochD && indicators.stochK < 50 ? 1 : 0);
    
    // Need 3+ signals for confidence
    if (bullishSignals >= 3) initialDirection = 'UP';
    else if (bearishSignals >= 3) initialDirection = 'DOWN';
    
    // HTF Bias (simplified - use structure trend)
    const htfBias = marketStructure.trend === 'BULLISH' ? 'BULLISH' : 
                    marketStructure.trend === 'BEARISH' ? 'BEARISH' : 'NEUTRAL';
    
    // Filters
    const filters = analyzeFilters(
      indicators.atr, indicators.close, indicators.adx,
      session, htfBias, initialDirection
    );
    
    // Entry Timing
    const entryTiming = analyzeEntryTiming(
      indicators.close, indicators.open, indicators.high, indicators.low,
      indicators.ema20, indicators.rsi, indicators.rsiPrev,
      indicators.stochK, indicators.stochD, initialDirection
    );
    
    // Confluence Score
    const confluence = calculateConfluence(
      indicators, marketStructure, liquidity, entryTiming, session, filters, initialDirection
    );
    
    // Final decision - STRICT: need high confluence AND direction AND active session
    const MIN_CONFLUENCE = 50; // Need at least 50% confluence
    const isActiveSession = session.current === 'LONDON' || session.current === 'NEW_YORK' || session.current === 'OVERLAP';
    const hasTrend = indicators.adx >= 20; // ADX shows trend exists
    
    const shouldTrade = initialDirection !== null && 
                        confluence.total >= MIN_CONFLUENCE && 
                        isActiveSession &&
                        hasTrend;
    
    let skipReason: string | null = null;
    if (!shouldTrade) {
      if (!initialDirection) {
        skipReason = 'Індикатори не підтверджують напрямок';
      } else if (confluence.total < MIN_CONFLUENCE) {
        skipReason = `Confluence ${confluence.total}% < ${MIN_CONFLUENCE}% мінімум`;
      } else if (!isActiveSession) {
        skipReason = `Сесія ${session.current} - чекаємо London/NY`;
      } else if (!hasTrend) {
        skipReason = `ADX ${indicators.adx.toFixed(0)} - флет, немає тренду`;
      }
    }
    
    // Multi-timeframe placeholder (simplified)
    const mtfAnalysis: TimeframeAnalysis[] = [{
      timeframe: `${timeframeMinutes}m`,
      direction: initialDirection || 'NEUTRAL',
      strength: confluence.total,
      indicators: { rsi: indicators.rsi, adx: indicators.adx }
    }];
    
    // AI Summary
    const aiSummary = buildAISummary(
      symbol, timeframeMinutes, indicators, marketStructure, liquidity,
      session, filters, entryTiming, confluence, initialDirection, shouldTrade
    );
    
    console.log(`[SMC] ${symbol}: Confluence=${confluence.total}%, Dir=${initialDirection || 'NONE'}, Trade=${shouldTrade}`);
    
    return {
      symbol,
      timeframe: timeframeMinutes,
      timestamp: new Date(),
      ohlcv,
      indicators,
      mtfAnalysis,
      htfBias: htfBias as any,
      marketStructure,
      liquidity,
      session,
      filters,
      entryTiming,
      confluence,
      finalDirection: shouldTrade ? initialDirection : null,
      confidence: confluence.total,
      shouldTrade,
      skipReason,
      aiSummary
    };
    
  } catch (error) {
    console.error('SMC Analysis error:', error);
    return createEmptyResult(symbol, timeframeMinutes, String(error));
  }
}

function buildAISummary(
  symbol: string,
  timeframe: number,
  ind: Indicators,
  structure: MarketStructure,
  liquidity: LiquidityZones,
  session: TradingSession,
  filters: Filters,
  timing: EntryTiming,
  confluence: ConfluenceScore,
  direction: 'UP' | 'DOWN' | null,
  shouldTrade: boolean
): string {
  const dir = direction === 'UP' ? 'LONG' : direction === 'DOWN' ? 'SHORT' : 'НЕЙТРАЛЬНО';
  
  let summary = `=== SMC АНАЛІЗ ${symbol} ${timeframe}m ===\n`;
  summary += `НАПРЯМОК: ${dir} | CONFLUENCE: ${confluence.total}%\n\n`;
  
  summary += `СТРУКТУРА: ${structure.structureDescription}\n`;
  summary += `ЛІКВІДНІСТЬ: ${liquidity.liquidityDescription}\n`;
  summary += `СЕСІЯ: ${session.description}\n`;
  summary += `ФІЛЬТРИ: ${filters.filterDescription}\n`;
  summary += `ВХІД: ${timing.entryDescription}\n\n`;
  
  summary += `ІНДИКАТОРИ:\n`;
  summary += `• RSI: ${ind.rsi.toFixed(1)} | MACD: ${ind.macd > ind.macdSignal ? 'бичачий' : 'ведмежий'}\n`;
  summary += `• Stoch: K=${ind.stochK.toFixed(0)} D=${ind.stochD.toFixed(0)} | CCI: ${ind.cci.toFixed(0)}\n`;
  summary += `• ADX: ${ind.adx.toFixed(1)} (+DI=${ind.adxPlus.toFixed(0)} -DI=${ind.adxMinus.toFixed(0)})\n`;
  summary += `• BB: ${(ind.bbPosition * 100).toFixed(0)}% позиція | ATR: ${ind.atr.toFixed(5)}\n`;
  summary += `• TV: ${(ind.recommendAll * 100).toFixed(0)}% | MA: ${(ind.recommendMA * 100).toFixed(0)}% | Osc: ${(ind.recommendOsc * 100).toFixed(0)}%\n\n`;
  
  summary += `CONFLUENCE BREAKDOWN:\n`;
  summary += `• Індикатори: ${confluence.indicatorScore}/30\n`;
  summary += `• Структура: ${confluence.structureScore}/25\n`;
  summary += `• Ліквідність: ${confluence.liquidityScore}/20\n`;
  summary += `• Таймінг: ${confluence.timingScore}/15\n`;
  summary += `• Сесія: ${confluence.sessionScore}/10\n`;
  summary += `TOTAL: ${confluence.total}/100\n\n`;
  
  if (shouldTrade) {
    summary += `✅ РЕКОМЕНДАЦІЯ: ${dir} з confluence ${confluence.total}%`;
  } else {
    summary += `❌ ПРОПУСТИТИ: ${filters.allFiltersPassed ? `Confluence ${confluence.total}% занизький` : filters.filterDescription}`;
  }
  
  return summary;
}

function createEmptyResult(symbol: string, timeframe: number, error: string): SMCAnalysisResult {
  const session = getCurrentSession();
  return {
    symbol,
    timeframe,
    timestamp: new Date(),
    ohlcv: { open: 0, high: 0, low: 0, close: 0 },
    indicators: {} as Indicators,
    mtfAnalysis: [],
    htfBias: 'NEUTRAL',
    marketStructure: {
      trend: 'RANGING', lastSwingHigh: null, lastSwingLow: null,
      higherHigh: false, higherLow: false, lowerHigh: false, lowerLow: false,
      bos: null, choch: null, structureDescription: 'Помилка аналізу'
    },
    liquidity: {
      equalHighs: false, equalLows: false, prevDayHigh: null, prevDayLow: null,
      sessionHigh: null, sessionLow: null, fvgBullish: false, fvgBearish: false,
      premiumZone: false, discountZone: false, liquiditySweep: null,
      liquidityDescription: 'N/A'
    },
    session,
    filters: {
      htfTrendAligned: false, atrValid: false, spreadOk: false, isRanging: true,
      sessionAllowed: false, newsRisk: false, allFiltersPassed: false,
      filterDescription: error
    },
    entryTiming: {
      breakRetest: false, impulsePullback: false, rejectionCandle: false,
      fakeBreakout: false, entryType: null, entryDescription: 'N/A'
    },
    confluence: {
      total: 0, indicatorScore: 0, structureScore: 0, liquidityScore: 0,
      timingScore: 0, sessionScore: 0, breakdown: [error]
    },
    finalDirection: null,
    confidence: 0,
    shouldTrade: false,
    skipReason: error,
    aiSummary: `Помилка SMC аналізу: ${error}`
  };
}
