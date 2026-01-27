const TRADINGVIEW_API_URL = 'https://scanner.tradingview.com/forex/scan';

interface TradingViewIndicator {
  name: string;
  value: number | string;
}

interface TradingViewAnalysisResult {
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  recommendation: 'UP' | 'DOWN' | null;
  confidence: number;
  indicators: {
    rsi?: number;
    macd?: number;
    ema20?: number;
    ema50?: number;
    sma20?: number;
    sma50?: number;
  };
  summary: string;
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

// TradingView Recommend.All values: -1 (strong sell) to +1 (strong buy)
function calculateSignalFromRecommend(recommendAll: number): TradingViewAnalysisResult['signal'] {
  // STRICT thresholds for REAL accuracy
  if (recommendAll >= 0.5) return 'STRONG_BUY';   // Very bullish (was 0.6)
  if (recommendAll >= 0.2) return 'BUY';
  if (recommendAll <= -0.5) return 'STRONG_SELL'; // Very bearish (was -0.6)
  if (recommendAll <= -0.2) return 'SELL';
  return 'NEUTRAL';
}

export async function getTradingViewAnalysis(
  symbol: string, 
  timeframeMinutes: number
): Promise<TradingViewAnalysisResult> {
  const pair = symbol.replace('/', '');
  const interval = getTimeframeInterval(timeframeMinutes);
  
  const indicators = [
    `Recommend.All|${interval}`,
    `Recommend.MA|${interval}`,
    `Recommend.Other|${interval}`,
    `RSI|${interval}`,
    `RSI[1]|${interval}`,
    `MACD.macd|${interval}`,
    `MACD.signal|${interval}`,
    `EMA20|${interval}`,
    `EMA50|${interval}`,
    `SMA20|${interval}`,
    `SMA50|${interval}`,
    `close|${interval}`,
    `ADX|${interval}`,
    `ADX+DI|${interval}`,
    `ADX-DI|${interval}`,
  ];

  try {
    const response = await fetch(TRADINGVIEW_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbols: {
          tickers: [`FX:${pair}`],
          query: { types: [] }
        },
        columns: indicators
      })
    });

    if (!response.ok) {
      throw new Error(`TradingView API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No data from TradingView');
    }

    const values = data.data[0].d;
    const recommendAll = values[0] as number;   // MAIN indicator: -1 to +1
    const recommendMA = values[1] as number;    // Moving Averages: -1 to +1
    const recommendOther = values[2] as number; // Oscillators: -1 to +1
    const rsi = values[3] as number;
    const macd = values[5] as number;
    const macdSignal = values[6] as number;
    const ema20 = values[7] as number;
    const ema50 = values[8] as number;
    const sma20 = values[9] as number;
    const sma50 = values[10] as number;
    const close = values[11] as number;
    const adx = values[12] as number;
    const adxPlus = values[13] as number;
    const adxMinus = values[14] as number;

    // Use REAL TradingView recommendation directly
    // This is the actual aggregate of all TradingView indicators
    const signal = calculateSignalFromRecommend(recommendAll);
    
    // Log real TradingView values for debugging
    console.log(`[TV] ${symbol}: Recommend=${recommendAll?.toFixed(3)}, MA=${recommendMA?.toFixed(3)}, Osc=${recommendOther?.toFixed(3)}, RSI=${rsi?.toFixed(1)}, ADX=${adx?.toFixed(1)}, Signal=${signal}`);
    
    let recommendation: 'UP' | 'DOWN' | null = null;
    let confidence = 0;

    // Calculate confidence from REAL TradingView values (no random!)
    const absRecommend = Math.abs(recommendAll || 0);
    const realConfidence = Math.round(50 + absRecommend * 49); // 50-99% based on strength

    if (signal === 'STRONG_BUY') {
      recommendation = 'UP';
      confidence = Math.max(85, realConfidence);
    } else if (signal === 'BUY') {
      recommendation = 'UP';
      confidence = Math.max(65, realConfidence);
    } else if (signal === 'STRONG_SELL') {
      recommendation = 'DOWN';
      confidence = Math.max(85, realConfidence);
    } else if (signal === 'SELL') {
      recommendation = 'DOWN';
      confidence = Math.max(65, realConfidence);
    } else {
      recommendation = null;
      confidence = 0;
    }

    let summary = '';
    if (recommendation === 'UP') {
      summary = `TradingView показує ${signal === 'STRONG_BUY' ? 'сильний' : ''} сигнал на покупку. RSI: ${rsi?.toFixed(1) || 'N/A'}, MACD ${macd > macdSignal ? 'вище' : 'нижче'} сигнальної лінії. Ціна ${close > ema50 ? 'вище' : 'нижче'} EMA50.`;
    } else if (recommendation === 'DOWN') {
      summary = `TradingView показує ${signal === 'STRONG_SELL' ? 'сильний' : ''} сигнал на продаж. RSI: ${rsi?.toFixed(1) || 'N/A'}, MACD ${macd < macdSignal ? 'нижче' : 'вище'} сигнальної лінії. Ціна ${close < ema50 ? 'нижче' : 'вище'} EMA50.`;
    } else {
      summary = `Ринок у нейтральному стані. RSI: ${rsi?.toFixed(1) || 'N/A'} (нейтральна зона). Немає чіткого напрямку руху.`;
    }

    return {
      signal,
      recommendation,
      confidence: Math.round(confidence),
      indicators: {
        rsi,
        macd,
        ema20,
        ema50,
        sma20,
        sma50
      },
      summary
    };

  } catch (error) {
    console.error('TradingView API error:', error);
    
    return {
      signal: 'NEUTRAL',
      recommendation: null,
      confidence: 0,
      indicators: {},
      summary: 'Не вдалося отримати дані від TradingView. Спробуйте пізніше.'
    };
  }
}
