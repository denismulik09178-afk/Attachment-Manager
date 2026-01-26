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

function calculateSignal(buyCount: number, sellCount: number, neutralCount: number): TradingViewAnalysisResult['signal'] {
  const total = buyCount + sellCount + neutralCount;
  if (total === 0) return 'NEUTRAL';
  
  const buyRatio = buyCount / total;
  const sellRatio = sellCount / total;
  
  if (buyRatio > 0.6) return 'STRONG_BUY';
  if (buyRatio > 0.4) return 'BUY';
  if (sellRatio > 0.6) return 'STRONG_SELL';
  if (sellRatio > 0.4) return 'SELL';
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
    const recommendAll = values[0] as number;
    const recommendMA = values[1] as number;
    const recommendOther = values[2] as number;
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

    let buyCount = 0;
    let sellCount = 0;
    let neutralCount = 0;

    [recommendAll, recommendMA, recommendOther].forEach(rec => {
      if (rec > 0.1) buyCount++;
      else if (rec < -0.1) sellCount++;
      else neutralCount++;
    });

    if (rsi < 30) buyCount++;
    else if (rsi > 70) sellCount++;
    else neutralCount++;

    if (macd > macdSignal) buyCount++;
    else if (macd < macdSignal) sellCount++;
    else neutralCount++;

    if (close > ema20 && close > ema50) buyCount++;
    else if (close < ema20 && close < ema50) sellCount++;
    else neutralCount++;

    if (adxPlus > adxMinus && adx > 25) buyCount++;
    else if (adxMinus > adxPlus && adx > 25) sellCount++;
    else neutralCount++;

    const signal = calculateSignal(buyCount, sellCount, neutralCount);
    
    let recommendation: 'UP' | 'DOWN' | null = null;
    let confidence = 0;

    if (signal === 'STRONG_BUY') {
      recommendation = 'UP';
      confidence = 85 + Math.random() * 10;
    } else if (signal === 'BUY') {
      recommendation = 'UP';
      confidence = 65 + Math.random() * 15;
    } else if (signal === 'STRONG_SELL') {
      recommendation = 'DOWN';
      confidence = 85 + Math.random() * 10;
    } else if (signal === 'SELL') {
      recommendation = 'DOWN';
      confidence = 65 + Math.random() * 15;
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
