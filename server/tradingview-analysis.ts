const TRADINGVIEW_API_URL = 'https://scanner.tradingview.com/forex/scan';

interface TradingViewIndicator {
  name: string;
  value: number | string;
}

interface ExtendedIndicators {
  // Core recommendations
  recommendAll?: number;
  recommendMA?: number;
  recommendOsc?: number;
  
  // Price data
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  
  // RSI indicators
  rsi?: number;
  rsi1?: number;
  
  // MACD indicators
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  
  // Moving Averages
  ema10?: number;
  ema20?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;
  sma10?: number;
  sma20?: number;
  sma50?: number;
  sma100?: number;
  sma200?: number;
  
  // ADX (Trend Strength)
  adx?: number;
  adxPlus?: number;
  adxMinus?: number;
  
  // Bollinger Bands
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  
  // Stochastic
  stochK?: number;
  stochD?: number;
  stochK1?: number;
  stochD1?: number;
  
  // CCI (Commodity Channel Index)
  cci?: number;
  
  // Williams %R
  williamsR?: number;
  
  // Momentum
  momentum?: number;
  
  // ATR (Volatility)
  atr?: number;
  
  // Ultimate Oscillator
  ultimateOsc?: number;
  
  // Awesome Oscillator
  ao?: number;
  
  // Ichimoku Cloud
  ichimokuBaseLine?: number;
  ichimokuConversionLine?: number;
  ichimokuLeadLine1?: number;
  ichimokuLeadLine2?: number;
  
  // Pivot Points
  pivotClassicS1?: number;
  pivotClassicS2?: number;
  pivotClassicR1?: number;
  pivotClassicR2?: number;
  pivotClassicMiddle?: number;
  
  // Volume indicators
  volumeChange?: number;
}

interface IndicatorSignal {
  name: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  strength: number; // 0-100
  reason: string;
}

interface TradingViewAnalysisResult {
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  recommendation: 'UP' | 'DOWN' | null;
  confidence: number;
  indicators: ExtendedIndicators;
  summary: string;
  indicatorSignals: IndicatorSignal[];
  confirmationCount: number;
  totalIndicators: number;
}

function getTimeframeInterval(minutes: number): string {
  if (minutes <= 1) return '1';
  if (minutes <= 5) return '5';
  if (minutes <= 15) return '15';
  if (minutes <= 30) return '30';
  if (minutes <= 60) return '60';
  if (minutes <= 240) return '240';
  return '1D';
}

// Analyze each indicator and get its signal
function analyzeIndicator(name: string, indicators: ExtendedIndicators): IndicatorSignal | null {
  const { 
    close, rsi, macd, macdSignal, 
    adx, adxPlus, adxMinus,
    ema20, ema50, sma20, sma50,
    bbUpper, bbLower, bbMiddle,
    stochK, stochD,
    cci, williamsR, momentum, ao,
    ichimokuBaseLine, ichimokuConversionLine,
    recommendAll, recommendMA, recommendOsc
  } = indicators;

  switch (name) {
    case 'RSI': {
      if (rsi === undefined) return null;
      // RSI < 30 = oversold (BUY), RSI > 70 = overbought (SELL)
      // Added RSI 40-60 neutral zone for stronger signals
      if (rsi < 25) return { name: 'RSI', direction: 'UP', strength: 90, reason: `RSI ${rsi.toFixed(1)} - сильно перепроданий` };
      if (rsi < 30) return { name: 'RSI', direction: 'UP', strength: 75, reason: `RSI ${rsi.toFixed(1)} - перепроданий` };
      if (rsi > 75) return { name: 'RSI', direction: 'DOWN', strength: 90, reason: `RSI ${rsi.toFixed(1)} - сильно перекуплений` };
      if (rsi > 70) return { name: 'RSI', direction: 'DOWN', strength: 75, reason: `RSI ${rsi.toFixed(1)} - перекуплений` };
      // Trend continuation signals
      if (rsi > 50 && rsi < 70) return { name: 'RSI', direction: 'UP', strength: 55, reason: `RSI ${rsi.toFixed(1)} - бичача зона` };
      if (rsi < 50 && rsi > 30) return { name: 'RSI', direction: 'DOWN', strength: 55, reason: `RSI ${rsi.toFixed(1)} - ведмежа зона` };
      return { name: 'RSI', direction: 'NEUTRAL', strength: 30, reason: `RSI ${rsi.toFixed(1)} - нейтральна зона` };
    }

    case 'MACD': {
      if (macd === undefined || macdSignal === undefined) return null;
      const diff = macd - macdSignal;
      const strength = Math.min(90, 50 + Math.abs(diff) * 1000);
      if (diff > 0.0005) return { name: 'MACD', direction: 'UP', strength, reason: `MACD вище сигнальної на ${diff.toFixed(5)}` };
      if (diff < -0.0005) return { name: 'MACD', direction: 'DOWN', strength, reason: `MACD нижче сигнальної на ${Math.abs(diff).toFixed(5)}` };
      return { name: 'MACD', direction: 'NEUTRAL', strength: 30, reason: 'MACD біля сигнальної лінії' };
    }

    case 'ADX': {
      if (adx === undefined || adxPlus === undefined || adxMinus === undefined) return null;
      // ADX > 25 = strong trend, ADX < 20 = weak/no trend
      if (adx < 20) return { name: 'ADX', direction: 'NEUTRAL', strength: 20, reason: `ADX ${adx.toFixed(1)} - слабкий тренд` };
      const strength = Math.min(95, 50 + adx);
      if (adxPlus > adxMinus && adx >= 25) return { name: 'ADX', direction: 'UP', strength, reason: `ADX ${adx.toFixed(1)}, +DI>${-adxMinus.toFixed(0)} - сильний бичачий` };
      if (adxMinus > adxPlus && adx >= 25) return { name: 'ADX', direction: 'DOWN', strength, reason: `ADX ${adx.toFixed(1)}, -DI>${adxPlus.toFixed(0)} - сильний ведмежий` };
      return { name: 'ADX', direction: 'NEUTRAL', strength: 40, reason: `ADX ${adx.toFixed(1)} - невизначений напрям` };
    }

    case 'EMA_CROSS': {
      if (ema20 === undefined || ema50 === undefined || close === undefined) return null;
      const diff = ((ema20 - ema50) / ema50) * 100;
      if (ema20 > ema50 && close > ema20) return { name: 'EMA Cross', direction: 'UP', strength: 75, reason: `EMA20 > EMA50, ціна вище EMA20` };
      if (ema20 < ema50 && close < ema20) return { name: 'EMA Cross', direction: 'DOWN', strength: 75, reason: `EMA20 < EMA50, ціна нижче EMA20` };
      if (close > ema50) return { name: 'EMA Cross', direction: 'UP', strength: 55, reason: 'Ціна вище EMA50' };
      if (close < ema50) return { name: 'EMA Cross', direction: 'DOWN', strength: 55, reason: 'Ціна нижче EMA50' };
      return { name: 'EMA Cross', direction: 'NEUTRAL', strength: 30, reason: 'Немає чіткого EMA сигналу' };
    }

    case 'SMA_CROSS': {
      if (sma20 === undefined || sma50 === undefined || close === undefined) return null;
      if (sma20 > sma50 && close > sma20) return { name: 'SMA Cross', direction: 'UP', strength: 70, reason: `SMA20 > SMA50` };
      if (sma20 < sma50 && close < sma20) return { name: 'SMA Cross', direction: 'DOWN', strength: 70, reason: `SMA20 < SMA50` };
      return { name: 'SMA Cross', direction: 'NEUTRAL', strength: 30, reason: 'SMA нейтральний' };
    }

    case 'BOLLINGER': {
      if (bbUpper === undefined || bbLower === undefined || close === undefined) return null;
      const bbWidth = bbUpper - bbLower;
      const position = (close - bbLower) / bbWidth;
      if (position < 0.1) return { name: 'Bollinger', direction: 'UP', strength: 85, reason: 'Ціна біля нижньої смуги Боллінджера' };
      if (position < 0.2) return { name: 'Bollinger', direction: 'UP', strength: 70, reason: 'Ціна в нижній зоні Боллінджера' };
      if (position > 0.9) return { name: 'Bollinger', direction: 'DOWN', strength: 85, reason: 'Ціна біля верхньої смуги Боллінджера' };
      if (position > 0.8) return { name: 'Bollinger', direction: 'DOWN', strength: 70, reason: 'Ціна у верхній зоні Боллінджера' };
      return { name: 'Bollinger', direction: 'NEUTRAL', strength: 35, reason: 'Ціна в середині смуг Боллінджера' };
    }

    case 'STOCHASTIC': {
      if (stochK === undefined || stochD === undefined) return null;
      // Stochastic < 20 = oversold, > 80 = overbought
      if (stochK < 15 && stochD < 20) return { name: 'Stochastic', direction: 'UP', strength: 90, reason: `Stoch K=${stochK.toFixed(0)}, D=${stochD.toFixed(0)} - сильно перепроданий` };
      if (stochK < 20) return { name: 'Stochastic', direction: 'UP', strength: 75, reason: `Stochastic ${stochK.toFixed(0)} - перепроданий` };
      if (stochK > 85 && stochD > 80) return { name: 'Stochastic', direction: 'DOWN', strength: 90, reason: `Stoch K=${stochK.toFixed(0)}, D=${stochD.toFixed(0)} - сильно перекуплений` };
      if (stochK > 80) return { name: 'Stochastic', direction: 'DOWN', strength: 75, reason: `Stochastic ${stochK.toFixed(0)} - перекуплений` };
      // Trend signals
      if (stochK > stochD && stochK > 50) return { name: 'Stochastic', direction: 'UP', strength: 55, reason: 'Stoch K > D, бичачий імпульс' };
      if (stochK < stochD && stochK < 50) return { name: 'Stochastic', direction: 'DOWN', strength: 55, reason: 'Stoch K < D, ведмежий імпульс' };
      return { name: 'Stochastic', direction: 'NEUTRAL', strength: 30, reason: `Stochastic нейтральний (${stochK.toFixed(0)})` };
    }

    case 'CCI': {
      if (cci === undefined) return null;
      // CCI < -100 = oversold, > 100 = overbought
      if (cci < -150) return { name: 'CCI', direction: 'UP', strength: 90, reason: `CCI ${cci.toFixed(0)} - екстремально перепроданий` };
      if (cci < -100) return { name: 'CCI', direction: 'UP', strength: 75, reason: `CCI ${cci.toFixed(0)} - перепроданий` };
      if (cci > 150) return { name: 'CCI', direction: 'DOWN', strength: 90, reason: `CCI ${cci.toFixed(0)} - екстремально перекуплений` };
      if (cci > 100) return { name: 'CCI', direction: 'DOWN', strength: 75, reason: `CCI ${cci.toFixed(0)} - перекуплений` };
      if (cci > 0) return { name: 'CCI', direction: 'UP', strength: 50, reason: `CCI ${cci.toFixed(0)} - бичача територія` };
      if (cci < 0) return { name: 'CCI', direction: 'DOWN', strength: 50, reason: `CCI ${cci.toFixed(0)} - ведмежа територія` };
      return { name: 'CCI', direction: 'NEUTRAL', strength: 30, reason: `CCI нейтральний` };
    }

    case 'WILLIAMS_R': {
      if (williamsR === undefined) return null;
      // Williams %R < -80 = oversold, > -20 = overbought
      if (williamsR < -90) return { name: 'Williams %R', direction: 'UP', strength: 90, reason: `W%R ${williamsR.toFixed(0)} - сильно перепроданий` };
      if (williamsR < -80) return { name: 'Williams %R', direction: 'UP', strength: 75, reason: `W%R ${williamsR.toFixed(0)} - перепроданий` };
      if (williamsR > -10) return { name: 'Williams %R', direction: 'DOWN', strength: 90, reason: `W%R ${williamsR.toFixed(0)} - сильно перекуплений` };
      if (williamsR > -20) return { name: 'Williams %R', direction: 'DOWN', strength: 75, reason: `W%R ${williamsR.toFixed(0)} - перекуплений` };
      return { name: 'Williams %R', direction: 'NEUTRAL', strength: 35, reason: `Williams %R нейтральний` };
    }

    case 'MOMENTUM': {
      if (momentum === undefined) return null;
      if (momentum > 0.002) return { name: 'Momentum', direction: 'UP', strength: 70, reason: 'Позитивний моментум' };
      if (momentum < -0.002) return { name: 'Momentum', direction: 'DOWN', strength: 70, reason: 'Негативний моментум' };
      return { name: 'Momentum', direction: 'NEUTRAL', strength: 30, reason: 'Моментум нейтральний' };
    }

    case 'AWESOME_OSC': {
      if (ao === undefined) return null;
      if (ao > 0.0003) return { name: 'Awesome Osc', direction: 'UP', strength: 65, reason: `AO позитивний (${ao.toFixed(5)})` };
      if (ao < -0.0003) return { name: 'Awesome Osc', direction: 'DOWN', strength: 65, reason: `AO негативний (${ao.toFixed(5)})` };
      return { name: 'Awesome Osc', direction: 'NEUTRAL', strength: 30, reason: 'AO нейтральний' };
    }

    case 'ICHIMOKU': {
      if (ichimokuBaseLine === undefined || ichimokuConversionLine === undefined || close === undefined) return null;
      if (close > ichimokuBaseLine && ichimokuConversionLine > ichimokuBaseLine) {
        return { name: 'Ichimoku', direction: 'UP', strength: 75, reason: 'Ціна вище хмари Ішимоку, бичачий сигнал' };
      }
      if (close < ichimokuBaseLine && ichimokuConversionLine < ichimokuBaseLine) {
        return { name: 'Ichimoku', direction: 'DOWN', strength: 75, reason: 'Ціна нижче хмари Ішимоку, ведмежий сигнал' };
      }
      return { name: 'Ichimoku', direction: 'NEUTRAL', strength: 35, reason: 'Ichimoku нейтральний' };
    }

    case 'TV_RECOMMEND_ALL': {
      if (recommendAll === undefined) return null;
      const strength = Math.round(50 + Math.abs(recommendAll) * 49);
      if (recommendAll >= 0.4) return { name: 'TV Recommend', direction: 'UP', strength: Math.max(80, strength), reason: `TradingView ${(recommendAll * 100).toFixed(0)}% BUY` };
      if (recommendAll >= 0.2) return { name: 'TV Recommend', direction: 'UP', strength, reason: `TradingView ${(recommendAll * 100).toFixed(0)}% бичачий` };
      if (recommendAll <= -0.4) return { name: 'TV Recommend', direction: 'DOWN', strength: Math.max(80, strength), reason: `TradingView ${(recommendAll * 100).toFixed(0)}% SELL` };
      if (recommendAll <= -0.2) return { name: 'TV Recommend', direction: 'DOWN', strength, reason: `TradingView ${(recommendAll * 100).toFixed(0)}% ведмежий` };
      return { name: 'TV Recommend', direction: 'NEUTRAL', strength: 30, reason: `TradingView нейтральний (${(recommendAll * 100).toFixed(0)}%)` };
    }

    case 'TV_RECOMMEND_MA': {
      if (recommendMA === undefined) return null;
      const strength = Math.round(50 + Math.abs(recommendMA) * 45);
      if (recommendMA >= 0.3) return { name: 'MA Recommend', direction: 'UP', strength, reason: `MA ${(recommendMA * 100).toFixed(0)}% BUY` };
      if (recommendMA <= -0.3) return { name: 'MA Recommend', direction: 'DOWN', strength, reason: `MA ${(recommendMA * 100).toFixed(0)}% SELL` };
      return { name: 'MA Recommend', direction: 'NEUTRAL', strength: 30, reason: 'MA нейтральний' };
    }

    case 'TV_RECOMMEND_OSC': {
      if (recommendOsc === undefined) return null;
      const strength = Math.round(50 + Math.abs(recommendOsc) * 45);
      if (recommendOsc >= 0.3) return { name: 'Osc Recommend', direction: 'UP', strength, reason: `Осцилятори ${(recommendOsc * 100).toFixed(0)}% BUY` };
      if (recommendOsc <= -0.3) return { name: 'Osc Recommend', direction: 'DOWN', strength, reason: `Осцилятори ${(recommendOsc * 100).toFixed(0)}% SELL` };
      return { name: 'Osc Recommend', direction: 'NEUTRAL', strength: 30, reason: 'Осцилятори нейтральні' };
    }

    default:
      return null;
  }
}

// Calculate final signal based on multiple indicator confirmation
function calculateMultiIndicatorSignal(signals: IndicatorSignal[]): {
  direction: 'UP' | 'DOWN' | null;
  confidence: number;
  confirmationCount: number;
} {
  const upSignals = signals.filter(s => s.direction === 'UP');
  const downSignals = signals.filter(s => s.direction === 'DOWN');
  const totalNonNeutral = upSignals.length + downSignals.length;
  
  if (totalNonNeutral === 0) {
    return { direction: null, confidence: 0, confirmationCount: 0 };
  }

  // Calculate weighted scores
  const upScore = upSignals.reduce((sum, s) => sum + s.strength, 0);
  const downScore = downSignals.reduce((sum, s) => sum + s.strength, 0);
  
  // STRICT REQUIREMENT: At least 5 indicators must agree for a signal
  const MIN_CONFIRMATION = 5;
  
  if (upSignals.length >= MIN_CONFIRMATION && upSignals.length > downSignals.length * 1.5) {
    const avgStrength = upScore / upSignals.length;
    const confirmationBonus = Math.min(20, (upSignals.length - MIN_CONFIRMATION) * 5);
    return {
      direction: 'UP',
      confidence: Math.min(95, Math.round(avgStrength + confirmationBonus)),
      confirmationCount: upSignals.length
    };
  }
  
  if (downSignals.length >= MIN_CONFIRMATION && downSignals.length > upSignals.length * 1.5) {
    const avgStrength = downScore / downSignals.length;
    const confirmationBonus = Math.min(20, (downSignals.length - MIN_CONFIRMATION) * 5);
    return {
      direction: 'DOWN',
      confidence: Math.min(95, Math.round(avgStrength + confirmationBonus)),
      confirmationCount: downSignals.length
    };
  }
  
  // Not enough confirmation
  return { direction: null, confidence: 0, confirmationCount: Math.max(upSignals.length, downSignals.length) };
}

export async function getTradingViewAnalysis(
  symbol: string, 
  timeframeMinutes: number
): Promise<TradingViewAnalysisResult> {
  const pair = symbol.replace('/', '');
  const interval = getTimeframeInterval(timeframeMinutes);
  
  const suffix = interval === '1D' ? '' : `|${interval}`;
  
  // EXPANDED indicator list for multi-confirmation system
  const indicatorColumns = [
    // Core recommendations (0-2)
    `Recommend.All${suffix}`,
    `Recommend.MA${suffix}`,
    `Recommend.Other${suffix}`,
    // Price data (3-6)
    `close${suffix}`,
    `open${suffix}`,
    `high${suffix}`,
    `low${suffix}`,
    // RSI (7-8)
    `RSI${suffix}`,
    `RSI[1]${suffix}`,
    // MACD (9-11)
    `MACD.macd${suffix}`,
    `MACD.signal${suffix}`,
    `Hist.Macd.macd${suffix}`,
    // Moving Averages (12-21)
    `EMA10${suffix}`,
    `EMA20${suffix}`,
    `EMA50${suffix}`,
    `EMA100${suffix}`,
    `EMA200${suffix}`,
    `SMA10${suffix}`,
    `SMA20${suffix}`,
    `SMA50${suffix}`,
    `SMA100${suffix}`,
    `SMA200${suffix}`,
    // ADX (22-24)
    `ADX${suffix}`,
    `ADX+DI${suffix}`,
    `ADX-DI${suffix}`,
    // Bollinger Bands (25-27)
    `BB.upper${suffix}`,
    `BB.lower${suffix}`,
    `BB.basis${suffix}`,
    // Stochastic (28-31)
    `Stoch.K${suffix}`,
    `Stoch.D${suffix}`,
    `Stoch.K[1]${suffix}`,
    `Stoch.D[1]${suffix}`,
    // CCI (32)
    `CCI20${suffix}`,
    // Williams %R (33)
    `W.R${suffix}`,
    // Momentum (34)
    `Mom${suffix}`,
    // ATR (35)
    `ATR${suffix}`,
    // Ultimate Oscillator (36)
    `UO${suffix}`,
    // Awesome Oscillator (37)
    `AO${suffix}`,
    // Ichimoku (38-41)
    `Ichimoku.BLine${suffix}`,
    `Ichimoku.CLine${suffix}`,
    `Ichimoku.Lead1${suffix}`,
    `Ichimoku.Lead2${suffix}`,
    // Pivot Points (42-46)
    `Pivot.M.Classic.S1${suffix}`,
    `Pivot.M.Classic.S2${suffix}`,
    `Pivot.M.Classic.R1${suffix}`,
    `Pivot.M.Classic.R2${suffix}`,
    `Pivot.M.Classic.Middle${suffix}`,
  ];

  try {
    const response = await fetch(TRADINGVIEW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        symbols: {
          tickers: [`FX:${pair}`],
          query: { types: [] }
        },
        columns: indicatorColumns
      })
    });

    if (!response.ok) {
      throw new Error(`TradingView API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No data from TradingView');
    }

    const v = data.data[0].d;
    
    // Parse all indicators
    const indicators: ExtendedIndicators = {
      recommendAll: v[0] as number,
      recommendMA: v[1] as number,
      recommendOsc: v[2] as number,
      close: v[3] as number,
      open: v[4] as number,
      high: v[5] as number,
      low: v[6] as number,
      rsi: v[7] as number,
      rsi1: v[8] as number,
      macd: v[9] as number,
      macdSignal: v[10] as number,
      macdHist: v[11] as number,
      ema10: v[12] as number,
      ema20: v[13] as number,
      ema50: v[14] as number,
      ema100: v[15] as number,
      ema200: v[16] as number,
      sma10: v[17] as number,
      sma20: v[18] as number,
      sma50: v[19] as number,
      sma100: v[20] as number,
      sma200: v[21] as number,
      adx: v[22] as number,
      adxPlus: v[23] as number,
      adxMinus: v[24] as number,
      bbUpper: v[25] as number,
      bbLower: v[26] as number,
      bbMiddle: v[27] as number,
      stochK: v[28] as number,
      stochD: v[29] as number,
      stochK1: v[30] as number,
      stochD1: v[31] as number,
      cci: v[32] as number,
      williamsR: v[33] as number,
      momentum: v[34] as number,
      atr: v[35] as number,
      ultimateOsc: v[36] as number,
      ao: v[37] as number,
      ichimokuBaseLine: v[38] as number,
      ichimokuConversionLine: v[39] as number,
      ichimokuLeadLine1: v[40] as number,
      ichimokuLeadLine2: v[41] as number,
      pivotClassicS1: v[42] as number,
      pivotClassicS2: v[43] as number,
      pivotClassicR1: v[44] as number,
      pivotClassicR2: v[45] as number,
      pivotClassicMiddle: v[46] as number,
    };

    // Analyze ALL indicators
    const indicatorNames = [
      'RSI', 'MACD', 'ADX', 'EMA_CROSS', 'SMA_CROSS',
      'BOLLINGER', 'STOCHASTIC', 'CCI', 'WILLIAMS_R',
      'MOMENTUM', 'AWESOME_OSC', 'ICHIMOKU',
      'TV_RECOMMEND_ALL', 'TV_RECOMMEND_MA', 'TV_RECOMMEND_OSC'
    ];

    const indicatorSignals: IndicatorSignal[] = [];
    for (const name of indicatorNames) {
      const signal = analyzeIndicator(name, indicators);
      if (signal) {
        indicatorSignals.push(signal);
      }
    }

    // Calculate multi-indicator confirmation
    const multiResult = calculateMultiIndicatorSignal(indicatorSignals);
    
    // Determine final signal
    let signal: TradingViewAnalysisResult['signal'] = 'NEUTRAL';
    let recommendation = multiResult.direction;
    let confidence = multiResult.confidence;

    if (recommendation === 'UP') {
      signal = confidence >= 80 ? 'STRONG_BUY' : 'BUY';
    } else if (recommendation === 'DOWN') {
      signal = confidence >= 80 ? 'STRONG_SELL' : 'SELL';
    }

    // ADDITIONAL STRICT FILTER: ADX must be >= 20 for trend confirmation
    if (indicators.adx !== undefined && indicators.adx < 20) {
      // Weak trend - reduce confidence or reject
      confidence = Math.round(confidence * 0.7);
      if (confidence < 60) {
        signal = 'NEUTRAL';
        recommendation = null;
        confidence = 0;
      }
    }

    // Log for debugging
    const upCount = indicatorSignals.filter(s => s.direction === 'UP').length;
    const downCount = indicatorSignals.filter(s => s.direction === 'DOWN').length;
    console.log(`[TV-MULTI] ${symbol}: UP=${upCount}, DOWN=${downCount}, Total=${indicatorSignals.length}, Conf=${confidence}%, Signal=${signal}`);
    
    // Build summary
    let summary = '';
    if (recommendation) {
      const topSignals = indicatorSignals
        .filter(s => s.direction === recommendation)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 5);
      
      summary = `${multiResult.confirmationCount}/${indicatorSignals.length} індикаторів підтверджують ${recommendation === 'UP' ? 'ВГОРУ' : 'ВНИЗ'}. `;
      summary += topSignals.map(s => s.reason).join('. ') + '.';
    } else {
      summary = `Немає чіткого сигналу. UP=${upCount}, DOWN=${downCount}. Потрібно мінімум 5 підтверджень.`;
    }

    return {
      signal,
      recommendation,
      confidence: Math.round(confidence),
      indicators,
      summary,
      indicatorSignals,
      confirmationCount: multiResult.confirmationCount,
      totalIndicators: indicatorSignals.length
    };

  } catch (error) {
    console.error('TradingView API error:', error);
    
    return {
      signal: 'NEUTRAL',
      recommendation: null,
      confidence: 0,
      indicators: {},
      summary: 'Не вдалося отримати дані від TradingView. Спробуйте пізніше.',
      indicatorSignals: [],
      confirmationCount: 0,
      totalIndicators: 0
    };
  }
}
