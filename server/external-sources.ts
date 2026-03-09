const TRADINGVIEW_API_URL = 'https://scanner.tradingview.com/forex/scan';

export interface ExternalSourceResult {
  name: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number;
  description: string;
}

export interface ExternalVerification {
  sources: ExternalSourceResult[];
  sourcesConfirmed: number;
  sourcesTotal: number;
  majorityDirection: 'UP' | 'DOWN' | null;
  verified: boolean;
  summary: string;
}

async function fetchTVRecommendation(pair: string, interval: string): Promise<{
  recommendAll: number;
  recommendMA: number;
  recommendOsc: number;
} | null> {
  try {
    const suffix = interval === '1D' ? '' : `|${interval}`;
    const response = await fetch(TRADINGVIEW_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        symbols: { tickers: [`FX:${pair}`], query: { types: [] } },
        columns: [
          `Recommend.All${suffix}`,
          `Recommend.MA${suffix}`,
          `Recommend.Other${suffix}`,
        ]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data.data?.[0]?.d) return null;

    const v = data.data[0].d;
    return {
      recommendAll: v[0] ?? 0,
      recommendMA: v[1] ?? 0,
      recommendOsc: v[2] ?? 0,
    };
  } catch {
    return null;
  }
}

function interpretRecommendation(value: number): 'UP' | 'DOWN' | 'NEUTRAL' {
  if (value >= 0.1) return 'UP';
  if (value <= -0.1) return 'DOWN';
  return 'NEUTRAL';
}

function recommendationStrength(value: number): number {
  return Math.min(100, Math.round(50 + Math.abs(value) * 50));
}

export async function verifyExternalSources(
  symbol: string,
  expectedDirection: 'UP' | 'DOWN'
): Promise<ExternalVerification> {
  const pair = symbol.replace('/', '');

  const timeframes = [
    { interval: '1', label: 'M1' },
    { interval: '5', label: 'M5' },
    { interval: '15', label: 'M15' },
    { interval: '60', label: 'H1' },
    { interval: '240', label: 'H4' },
    { interval: '1D', label: 'D1' },
  ];

  const results = await Promise.allSettled(
    timeframes.map(tf => fetchTVRecommendation(pair, tf.interval))
  );

  const sources: ExternalSourceResult[] = [];

  for (let i = 0; i < timeframes.length; i++) {
    const tf = timeframes[i];
    const result = results[i];

    if (result.status === 'fulfilled' && result.value) {
      const data = result.value;

      sources.push({
        name: `TradingView ${tf.label} Overall`,
        direction: interpretRecommendation(data.recommendAll),
        confidence: recommendationStrength(data.recommendAll),
        description: `TV ${tf.label}: ${(data.recommendAll * 100).toFixed(0)}%`
      });

      if (tf.interval === '5' || tf.interval === '15' || tf.interval === '60') {
        sources.push({
          name: `TradingView ${tf.label} MA`,
          direction: interpretRecommendation(data.recommendMA),
          confidence: recommendationStrength(data.recommendMA),
          description: `MA ${tf.label}: ${(data.recommendMA * 100).toFixed(0)}%`
        });
      }

      if (tf.interval === '1' || tf.interval === '5' || tf.interval === '15') {
        sources.push({
          name: `TradingView ${tf.label} Oscillators`,
          direction: interpretRecommendation(data.recommendOsc),
          confidence: recommendationStrength(data.recommendOsc),
          description: `Osc ${tf.label}: ${(data.recommendOsc * 100).toFixed(0)}%`
        });
      }
    }
  }

  const upCount = sources.filter(s => s.direction === 'UP').length;
  const downCount = sources.filter(s => s.direction === 'DOWN').length;
  const total = sources.length;

  const confirmedCount = expectedDirection === 'UP' ? upCount : downCount;
  const majorityDirection = upCount > downCount ? 'UP' : downCount > upCount ? 'DOWN' : null;
  const verified = total > 0 && confirmedCount > total / 2;

  const summary = `${confirmedCount}/${total} джерел підтверджують ${expectedDirection === 'UP' ? 'ВГОРУ' : 'ВНИЗ'}`;

  console.log(`[SOURCES] ${symbol}: UP=${upCount}, DOWN=${downCount}, Total=${total}, Verified=${verified}`);

  return {
    sources,
    sourcesConfirmed: confirmedCount,
    sourcesTotal: total,
    majorityDirection,
    verified,
    summary,
  };
}
