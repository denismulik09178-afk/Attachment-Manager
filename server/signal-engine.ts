import { getSMCAnalysis, type Indicators, type SMCAnalysisResult } from './smc-analysis';
import { verifyExternalSources, type ExternalVerification } from './external-sources';
import { checkNewsFilter, type NewsFilterResult } from './news-filter';

const TRADINGVIEW_API_URL = 'https://scanner.tradingview.com/forex/scan';

export interface IndicatorResult {
  name: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  strength: number;
  reason: string;
}

export interface EightIndicatorAnalysis {
  indicators: IndicatorResult[];
  agreementCount: number;
  totalIndicators: number;
  direction: 'UP' | 'DOWN' | null;
  passed: boolean;
}

export interface TimeframeResult {
  timeframe: string;
  minutes: number;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  indicators: Partial<Indicators>;
  strength: number;
}

export interface MultiTimeframeAnalysis {
  timeframes: TimeframeResult[];
  confirmedDirection: 'UP' | 'DOWN' | null;
  agreementCount: number;
  confirmed: boolean;
}

export interface SignalEngineResult {
  symbol: string;
  price: number;
  smcAnalysis: SMCAnalysisResult;
  eightIndicators: EightIndicatorAnalysis;
  multiTimeframe: MultiTimeframeAnalysis;
  externalSources: ExternalVerification;
  newsFilter: NewsFilterResult;
  finalConfidence: number;
  finalDirection: 'UP' | 'DOWN' | null;
  signalStrength: 'STRONG' | 'MEDIUM' | 'WEAK' | 'NONE';
  recommendedExpiration: number;
  shouldTrade: boolean;
  rejectReason: string | null;
  summary: string;
}

function analyzeEightIndicators(ind: Indicators): EightIndicatorAnalysis {
  const results: IndicatorResult[] = [];

  if (ind.rsi) {
    if (ind.rsi < 30) {
      results.push({ name: 'RSI', direction: 'UP', strength: 85, reason: `RSI ${ind.rsi.toFixed(1)} - перепроданий` });
    } else if (ind.rsi > 70) {
      results.push({ name: 'RSI', direction: 'DOWN', strength: 85, reason: `RSI ${ind.rsi.toFixed(1)} - перекуплений` });
    } else if (ind.rsi > 50) {
      results.push({ name: 'RSI', direction: 'UP', strength: 60, reason: `RSI ${ind.rsi.toFixed(1)} - бичача зона` });
    } else {
      results.push({ name: 'RSI', direction: 'DOWN', strength: 60, reason: `RSI ${ind.rsi.toFixed(1)} - ведмежа зона` });
    }
  }

  if (ind.macd !== undefined && ind.macdSignal !== undefined) {
    const diff = ind.macd - ind.macdSignal;
    if (diff > 0.0002) {
      results.push({ name: 'MACD', direction: 'UP', strength: 75, reason: `MACD бичачий (${diff.toFixed(5)})` });
    } else if (diff < -0.0002) {
      results.push({ name: 'MACD', direction: 'DOWN', strength: 75, reason: `MACD ведмежий (${diff.toFixed(5)})` });
    } else {
      results.push({ name: 'MACD', direction: 'NEUTRAL', strength: 30, reason: 'MACD нейтральний' });
    }
  }

  if (ind.ema50 && ind.ema200 && ind.close) {
    const ema50Above200 = ind.ema50 > ind.ema200;
    const priceAboveEma50 = ind.close > ind.ema50;
    if (ema50Above200 && priceAboveEma50) {
      results.push({ name: 'EMA 50/200', direction: 'UP', strength: 80, reason: 'EMA50 > EMA200, ціна вище' });
    } else if (!ema50Above200 && !priceAboveEma50) {
      results.push({ name: 'EMA 50/200', direction: 'DOWN', strength: 80, reason: 'EMA50 < EMA200, ціна нижче' });
    } else if (priceAboveEma50) {
      results.push({ name: 'EMA 50/200', direction: 'UP', strength: 55, reason: 'Ціна вище EMA50' });
    } else {
      results.push({ name: 'EMA 50/200', direction: 'DOWN', strength: 55, reason: 'Ціна нижче EMA50' });
    }
  }

  if (ind.bbUpper && ind.bbLower && ind.close) {
    const bbWidth = ind.bbUpper - ind.bbLower;
    const position = bbWidth > 0 ? (ind.close - ind.bbLower) / bbWidth : 0.5;
    if (position < 0.15) {
      results.push({ name: 'Bollinger Bands', direction: 'UP', strength: 85, reason: `BB позиція ${(position * 100).toFixed(0)}% - нижня межа` });
    } else if (position > 0.85) {
      results.push({ name: 'Bollinger Bands', direction: 'DOWN', strength: 85, reason: `BB позиція ${(position * 100).toFixed(0)}% - верхня межа` });
    } else if (position < 0.35) {
      results.push({ name: 'Bollinger Bands', direction: 'UP', strength: 60, reason: `BB позиція ${(position * 100).toFixed(0)}% - нижня зона` });
    } else if (position > 0.65) {
      results.push({ name: 'Bollinger Bands', direction: 'DOWN', strength: 60, reason: `BB позиція ${(position * 100).toFixed(0)}% - верхня зона` });
    } else {
      results.push({ name: 'Bollinger Bands', direction: 'NEUTRAL', strength: 30, reason: 'BB середня зона' });
    }
  }

  if (ind.stochK !== undefined && ind.stochD !== undefined) {
    if (ind.stochK < 20 && ind.stochK > ind.stochD) {
      results.push({ name: 'Stochastic', direction: 'UP', strength: 90, reason: `Stoch K=${ind.stochK.toFixed(0)} кросовер знизу` });
    } else if (ind.stochK > 80 && ind.stochK < ind.stochD) {
      results.push({ name: 'Stochastic', direction: 'DOWN', strength: 90, reason: `Stoch K=${ind.stochK.toFixed(0)} кросовер зверху` });
    } else if (ind.stochK > ind.stochD && ind.stochK > 50) {
      results.push({ name: 'Stochastic', direction: 'UP', strength: 60, reason: `Stoch K=${ind.stochK.toFixed(0)} бичачий` });
    } else if (ind.stochK < ind.stochD && ind.stochK < 50) {
      results.push({ name: 'Stochastic', direction: 'DOWN', strength: 60, reason: `Stoch K=${ind.stochK.toFixed(0)} ведмежий` });
    } else {
      results.push({ name: 'Stochastic', direction: 'NEUTRAL', strength: 30, reason: `Stoch нейтральний` });
    }
  }

  if (ind.recommendOsc !== undefined) {
    if (ind.recommendOsc > 0.15) {
      results.push({ name: 'Volume/Momentum', direction: 'UP', strength: 70, reason: `Об\'єм/імпульс бичачий (${(ind.recommendOsc * 100).toFixed(0)}%)` });
    } else if (ind.recommendOsc < -0.15) {
      results.push({ name: 'Volume/Momentum', direction: 'DOWN', strength: 70, reason: `Об\'єм/імпульс ведмежий (${(ind.recommendOsc * 100).toFixed(0)}%)` });
    } else {
      results.push({ name: 'Volume/Momentum', direction: 'NEUTRAL', strength: 30, reason: 'Об\'єм/імпульс нейтральний' });
    }
  }

  if (ind.high && ind.low && ind.close && ind.ema20) {
    const range = ind.high - ind.low;
    const midpoint = (ind.high + ind.low) / 2;
    const nearSupport = ind.close < midpoint && Math.abs(ind.close - ind.low) < range * 0.25;
    const nearResistance = ind.close > midpoint && Math.abs(ind.close - ind.high) < range * 0.25;

    if (nearSupport) {
      results.push({ name: 'Support/Resistance', direction: 'UP', strength: 70, reason: 'Ціна біля рівня підтримки' });
    } else if (nearResistance) {
      results.push({ name: 'Support/Resistance', direction: 'DOWN', strength: 70, reason: 'Ціна біля рівня опору' });
    } else if (ind.close > midpoint) {
      results.push({ name: 'Support/Resistance', direction: 'UP', strength: 50, reason: 'Ціна вище середнього рівня' });
    } else {
      results.push({ name: 'Support/Resistance', direction: 'DOWN', strength: 50, reason: 'Ціна нижче середнього рівня' });
    }
  }

  if (ind.close && ind.open && ind.high && ind.low) {
    const bodySize = Math.abs(ind.close - ind.open);
    const totalRange = ind.high - ind.low;
    const upperWick = ind.high - Math.max(ind.close, ind.open);
    const lowerWick = Math.min(ind.close, ind.open) - ind.low;

    if (totalRange > 0) {
      const bodyRatio = bodySize / totalRange;
      const isBullishCandle = ind.close > ind.open;

      if (isBullishCandle && lowerWick > bodySize * 2 && upperWick < bodySize * 0.5) {
        results.push({ name: 'Price Action', direction: 'UP', strength: 80, reason: 'Молот (Hammer) - розворот вгору' });
      } else if (!isBullishCandle && upperWick > bodySize * 2 && lowerWick < bodySize * 0.5) {
        results.push({ name: 'Price Action', direction: 'DOWN', strength: 80, reason: 'Падаюча зірка - розворот вниз' });
      } else if (bodyRatio > 0.7 && isBullishCandle) {
        results.push({ name: 'Price Action', direction: 'UP', strength: 65, reason: 'Сильна бичача свічка' });
      } else if (bodyRatio > 0.7 && !isBullishCandle) {
        results.push({ name: 'Price Action', direction: 'DOWN', strength: 65, reason: 'Сильна ведмежа свічка' });
      } else if (bodyRatio < 0.2) {
        results.push({ name: 'Price Action', direction: 'NEUTRAL', strength: 25, reason: 'Доджі - невизначеність' });
      } else if (isBullishCandle) {
        results.push({ name: 'Price Action', direction: 'UP', strength: 50, reason: 'Бичача свічка' });
      } else {
        results.push({ name: 'Price Action', direction: 'DOWN', strength: 50, reason: 'Ведмежа свічка' });
      }
    }
  }

  const upCount = results.filter(r => r.direction === 'UP').length;
  const downCount = results.filter(r => r.direction === 'DOWN').length;
  const EXPECTED_INDICATORS = 8;

  const MIN_AGREEMENT = 5;
  let direction: 'UP' | 'DOWN' | null = null;
  let agreementCount = 0;

  if (upCount >= MIN_AGREEMENT && upCount > downCount) {
    direction = 'UP';
    agreementCount = upCount;
  } else if (downCount >= MIN_AGREEMENT && downCount > upCount) {
    direction = 'DOWN';
    agreementCount = downCount;
  } else {
    agreementCount = Math.max(upCount, downCount);
  }

  const passed = direction !== null;

  console.log(`[8-IND] UP=${upCount}, DOWN=${downCount}, Analyzed=${results.length}/${EXPECTED_INDICATORS}, Agreed=${agreementCount}, Passed=${passed}`);

  return {
    indicators: results,
    agreementCount,
    totalIndicators: EXPECTED_INDICATORS,
    direction,
    passed,
  };
}

async function fetchTimeframeIndicators(pair: string, interval: string): Promise<Partial<Indicators> | null> {
  try {
    const suffix = interval === '1D' ? '' : `|${interval}`;
    const response = await fetch(TRADINGVIEW_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        symbols: { tickers: [`FX:${pair}`], query: { types: [] } },
        columns: [
          `close${suffix}`, `open${suffix}`, `high${suffix}`, `low${suffix}`,
          `EMA50${suffix}`, `EMA200${suffix}`,
          `RSI${suffix}`,
          `MACD.macd${suffix}`, `MACD.signal${suffix}`,
          `Stoch.K${suffix}`, `Stoch.D${suffix}`,
          `BB.upper${suffix}`, `BB.lower${suffix}`,
          `ADX${suffix}`,
          `Recommend.All${suffix}`, `Recommend.Other${suffix}`,
        ]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.data?.[0]?.d) return null;

    const v = data.data[0].d;
    return {
      close: v[0] ?? 0,
      open: v[1] ?? 0,
      high: v[2] ?? 0,
      low: v[3] ?? 0,
      ema50: v[4] ?? 0,
      ema200: v[5] ?? 0,
      rsi: v[6] ?? 50,
      macd: v[7] ?? 0,
      macdSignal: v[8] ?? 0,
      stochK: v[9] ?? 50,
      stochD: v[10] ?? 50,
      bbUpper: v[11] ?? 0,
      bbLower: v[12] ?? 0,
      adx: v[13] ?? 0,
      recommendAll: v[14] ?? 0,
      recommendOsc: v[15] ?? 0,
    };
  } catch {
    return null;
  }
}

function getTimeframeDirection(ind: Partial<Indicators>): { direction: 'UP' | 'DOWN' | 'NEUTRAL'; strength: number } {
  let upVotes = 0;
  let downVotes = 0;
  let totalStrength = 0;
  let count = 0;

  if (ind.rsi !== undefined) {
    count++;
    if (ind.rsi > 50) { upVotes++; totalStrength += 60; }
    else if (ind.rsi < 50) { downVotes++; totalStrength += 60; }
  }

  if (ind.macd !== undefined && ind.macdSignal !== undefined) {
    count++;
    if (ind.macd > ind.macdSignal) { upVotes++; totalStrength += 70; }
    else if (ind.macd < ind.macdSignal) { downVotes++; totalStrength += 70; }
    else { totalStrength += 30; }
  }

  if (ind.ema50 !== undefined && ind.ema200 !== undefined && ind.close !== undefined) {
    count++;
    if (ind.close > ind.ema50 && ind.ema50 > ind.ema200) { upVotes++; totalStrength += 80; }
    else if (ind.close < ind.ema50 && ind.ema50 < ind.ema200) { downVotes++; totalStrength += 80; }
    else { totalStrength += 40; }
  }

  if (ind.stochK !== undefined && ind.stochD !== undefined) {
    count++;
    if (ind.stochK > ind.stochD) { upVotes++; totalStrength += 60; }
    else if (ind.stochK < ind.stochD) { downVotes++; totalStrength += 60; }
    else { totalStrength += 30; }
  }

  if (ind.recommendAll !== undefined) {
    count++;
    if (ind.recommendAll > 0.1) { upVotes++; totalStrength += 70; }
    else if (ind.recommendAll < -0.1) { downVotes++; totalStrength += 70; }
  }

  if (upVotes > downVotes && upVotes >= 3) {
    return { direction: 'UP', strength: Math.round(totalStrength / count) };
  } else if (downVotes > upVotes && downVotes >= 3) {
    return { direction: 'DOWN', strength: Math.round(totalStrength / count) };
  }
  return { direction: 'NEUTRAL', strength: Math.round(totalStrength / Math.max(count, 1)) };
}

async function analyzeMultiTimeframe(symbol: string): Promise<MultiTimeframeAnalysis> {
  const pair = symbol.replace('/', '');

  const tfConfigs = [
    { interval: '1', label: 'M1', minutes: 1 },
    { interval: '5', label: 'M5', minutes: 5 },
    { interval: '15', label: 'M15', minutes: 15 },
  ];

  const results = await Promise.allSettled(
    tfConfigs.map(tf => fetchTimeframeIndicators(pair, tf.interval))
  );

  const timeframes: TimeframeResult[] = [];

  for (let i = 0; i < tfConfigs.length; i++) {
    const tf = tfConfigs[i];
    const result = results[i];

    if (result.status === 'fulfilled' && result.value) {
      const { direction, strength } = getTimeframeDirection(result.value);
      timeframes.push({
        timeframe: tf.label,
        minutes: tf.minutes,
        direction,
        indicators: result.value,
        strength,
      });
    }
  }

  const upCount = timeframes.filter(t => t.direction === 'UP').length;
  const downCount = timeframes.filter(t => t.direction === 'DOWN').length;

  let confirmedDirection: 'UP' | 'DOWN' | null = null;
  let agreementCount = 0;

  if (upCount >= 2) {
    confirmedDirection = 'UP';
    agreementCount = upCount;
  } else if (downCount >= 2) {
    confirmedDirection = 'DOWN';
    agreementCount = downCount;
  } else {
    agreementCount = Math.max(upCount, downCount);
  }

  const confirmed = confirmedDirection !== null;

  console.log(`[MTF] ${symbol}: UP=${upCount}, DOWN=${downCount}, Confirmed=${confirmed} (${confirmedDirection || 'NONE'})`);

  return {
    timeframes,
    confirmedDirection,
    agreementCount,
    confirmed,
  };
}

function calculateFinalConfidence(
  eightInd: EightIndicatorAnalysis,
  mtf: MultiTimeframeAnalysis,
  sources: ExternalVerification,
  smc: SMCAnalysisResult
): number {
  let confidence = 0;

  const indicatorWeight = 40;
  if (eightInd.passed) {
    const ratio = eightInd.agreementCount / eightInd.totalIndicators;
    confidence += indicatorWeight * ratio;
  }

  const mtfWeight = 25;
  if (mtf.confirmed) {
    const ratio = mtf.agreementCount / 3;
    confidence += mtfWeight * ratio;
  }

  const sourceWeight = 20;
  if (sources.sourcesTotal > 0) {
    const ratio = sources.sourcesConfirmed / sources.sourcesTotal;
    confidence += sourceWeight * ratio;
  }

  const smcWeight = 15;
  if (smc.shouldTrade) {
    confidence += smcWeight * (smc.confluence.total / 100);
  }

  return Math.round(Math.min(100, Math.max(0, confidence)));
}

function determineExpiration(confidence: number, signalStrength: string): number {
  if (signalStrength === 'STRONG') {
    return confidence >= 95 ? 10 : 5;
  } else if (signalStrength === 'MEDIUM') {
    return confidence >= 85 ? 5 : 3;
  }
  return 3;
}

export async function runSignalEngine(
  symbol: string,
  requestedTimeframe: number
): Promise<SignalEngineResult> {
  console.log(`\n========== SIGNAL ENGINE: ${symbol} ==========`);

  const newsFilter = checkNewsFilter(symbol);
  if (newsFilter.blocked) {
    const emptySmc = await getSMCAnalysis(symbol, requestedTimeframe);
    return {
      symbol,
      price: emptySmc.indicators.close || 0,
      smcAnalysis: emptySmc,
      eightIndicators: { indicators: [], agreementCount: 0, totalIndicators: 0, direction: null, passed: false },
      multiTimeframe: { timeframes: [], confirmedDirection: null, agreementCount: 0, confirmed: false },
      externalSources: { sources: [], sourcesConfirmed: 0, sourcesTotal: 0, majorityDirection: null, verified: false, summary: '' },
      newsFilter,
      finalConfidence: 0,
      finalDirection: null,
      signalStrength: 'NONE',
      recommendedExpiration: 0,
      shouldTrade: false,
      rejectReason: newsFilter.reason,
      summary: `❌ ЗАБЛОКОВАНО: ${newsFilter.reason}`,
    };
  }

  const [smcAnalysis, multiTimeframe] = await Promise.all([
    getSMCAnalysis(symbol, requestedTimeframe),
    analyzeMultiTimeframe(symbol),
  ]);

  const eightIndicators = analyzeEightIndicators(smcAnalysis.indicators);

  if (!eightIndicators.passed) {
    return {
      symbol,
      price: smcAnalysis.indicators.close || 0,
      smcAnalysis,
      eightIndicators,
      multiTimeframe,
      externalSources: { sources: [], sourcesConfirmed: 0, sourcesTotal: 0, majorityDirection: null, verified: false, summary: '' },
      newsFilter,
      finalConfidence: 0,
      finalDirection: null,
      signalStrength: 'NONE',
      recommendedExpiration: 0,
      shouldTrade: false,
      rejectReason: `Недостатньо індикаторів: ${eightIndicators.agreementCount}/8 (потрібно 5+)`,
      summary: `❌ ${eightIndicators.agreementCount}/8 індикаторів - недостатньо для сигналу`,
    };
  }

  if (!multiTimeframe.confirmed) {
    return {
      symbol,
      price: smcAnalysis.indicators.close || 0,
      smcAnalysis,
      eightIndicators,
      multiTimeframe,
      externalSources: { sources: [], sourcesConfirmed: 0, sourcesTotal: 0, majorityDirection: null, verified: false, summary: '' },
      newsFilter,
      finalConfidence: 0,
      finalDirection: null,
      signalStrength: 'NONE',
      recommendedExpiration: 0,
      shouldTrade: false,
      rejectReason: `Таймфрейми не підтверджують: ${multiTimeframe.agreementCount}/3 (потрібно 2+)`,
      summary: `❌ Лише ${multiTimeframe.agreementCount}/3 таймфрейми підтверджують`,
    };
  }

  if (eightIndicators.direction !== multiTimeframe.confirmedDirection) {
    return {
      symbol,
      price: smcAnalysis.indicators.close || 0,
      smcAnalysis,
      eightIndicators,
      multiTimeframe,
      externalSources: { sources: [], sourcesConfirmed: 0, sourcesTotal: 0, majorityDirection: null, verified: false, summary: '' },
      newsFilter,
      finalConfidence: 0,
      finalDirection: null,
      signalStrength: 'NONE',
      recommendedExpiration: 0,
      shouldTrade: false,
      rejectReason: `Конфлікт: індикатори (${eightIndicators.direction}) ≠ таймфрейми (${multiTimeframe.confirmedDirection})`,
      summary: `❌ Конфлікт між індикаторами та таймфреймами`,
    };
  }

  const direction = eightIndicators.direction!;
  const externalSources = await verifyExternalSources(symbol, direction);

  if (!externalSources.verified) {
    return {
      symbol,
      price: smcAnalysis.indicators.close || 0,
      smcAnalysis,
      eightIndicators,
      multiTimeframe,
      externalSources,
      newsFilter,
      finalConfidence: 0,
      finalDirection: null,
      signalStrength: 'NONE',
      recommendedExpiration: 0,
      shouldTrade: false,
      rejectReason: `Зовнішні джерела не підтверджують: ${externalSources.sourcesConfirmed}/${externalSources.sourcesTotal}`,
      summary: `❌ ${externalSources.sourcesConfirmed}/${externalSources.sourcesTotal} джерел підтверджують`,
    };
  }

  const finalConfidence = calculateFinalConfidence(eightIndicators, multiTimeframe, externalSources, smcAnalysis);

  let signalStrength: 'STRONG' | 'MEDIUM' | 'WEAK' | 'NONE';
  if (finalConfidence >= 90) signalStrength = 'STRONG';
  else if (finalConfidence >= 80) signalStrength = 'MEDIUM';
  else signalStrength = 'WEAK';

  if (finalConfidence < 80) {
    return {
      symbol,
      price: smcAnalysis.indicators.close || 0,
      smcAnalysis,
      eightIndicators,
      multiTimeframe,
      externalSources,
      newsFilter,
      finalConfidence,
      finalDirection: direction,
      signalStrength: 'WEAK',
      recommendedExpiration: 0,
      shouldTrade: false,
      rejectReason: `Впевненість ${finalConfidence}% < 80% мінімум`,
      summary: `❌ Впевненість ${finalConfidence}% - занизька для сигналу`,
    };
  }

  const recommendedExpiration = determineExpiration(finalConfidence, signalStrength);

  const dirText = direction === 'UP' ? 'ВГОРУ' : 'ВНИЗ';
  const summary = `✅ ${dirText} | ${finalConfidence}% | ${eightIndicators.agreementCount}/8 інд. | ${multiTimeframe.agreementCount}/3 ТФ | ${externalSources.sourcesConfirmed}/${externalSources.sourcesTotal} джерел | ${recommendedExpiration}хв`;

  console.log(`[ENGINE] ${symbol}: ${summary}`);

  return {
    symbol,
    price: smcAnalysis.indicators.close || 0,
    smcAnalysis,
    eightIndicators,
    multiTimeframe,
    externalSources,
    newsFilter,
    finalConfidence,
    finalDirection: direction,
    signalStrength,
    recommendedExpiration,
    shouldTrade: true,
    rejectReason: null,
    summary,
  };
}
