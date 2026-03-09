export interface NewsEvent {
  time: string;
  utcHour: number;
  utcMinute: number;
  title: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  dayOfWeek?: number;
}

export interface NewsFilterResult {
  blocked: boolean;
  nearbyEvents: NewsEvent[];
  reason: string | null;
  nextEventMinutes: number | null;
}

const HIGH_IMPACT_SCHEDULE: NewsEvent[] = [
  { time: '13:30', utcHour: 13, utcMinute: 30, title: 'Non-Farm Payrolls (NFP)', currency: 'USD', impact: 'high', dayOfWeek: 5 },
  { time: '13:30', utcHour: 13, utcMinute: 30, title: 'Unemployment Claims', currency: 'USD', impact: 'high', dayOfWeek: 4 },
  { time: '13:30', utcHour: 13, utcMinute: 30, title: 'CPI / Inflation Data', currency: 'USD', impact: 'high' },
  { time: '15:00', utcHour: 15, utcMinute: 0, title: 'ISM Manufacturing PMI', currency: 'USD', impact: 'high' },
  { time: '19:00', utcHour: 19, utcMinute: 0, title: 'FOMC Rate Decision', currency: 'USD', impact: 'high' },
  { time: '19:30', utcHour: 19, utcMinute: 30, title: 'FOMC Press Conference', currency: 'USD', impact: 'high' },
  { time: '13:30', utcHour: 13, utcMinute: 30, title: 'GDP (Quarterly)', currency: 'USD', impact: 'high' },
  { time: '13:30', utcHour: 13, utcMinute: 30, title: 'Retail Sales', currency: 'USD', impact: 'high' },
  
  { time: '12:15', utcHour: 12, utcMinute: 15, title: 'ECB Rate Decision', currency: 'EUR', impact: 'high' },
  { time: '12:45', utcHour: 12, utcMinute: 45, title: 'ECB Press Conference', currency: 'EUR', impact: 'high' },
  { time: '10:00', utcHour: 10, utcMinute: 0, title: 'Eurozone CPI', currency: 'EUR', impact: 'high' },
  { time: '10:00', utcHour: 10, utcMinute: 0, title: 'Eurozone GDP', currency: 'EUR', impact: 'high' },
  
  { time: '12:00', utcHour: 12, utcMinute: 0, title: 'BOE Rate Decision', currency: 'GBP', impact: 'high' },
  { time: '07:00', utcHour: 7, utcMinute: 0, title: 'UK GDP', currency: 'GBP', impact: 'high' },
  { time: '07:00', utcHour: 7, utcMinute: 0, title: 'UK CPI', currency: 'GBP', impact: 'high' },
  
  { time: '00:00', utcHour: 0, utcMinute: 0, title: 'BOJ Rate Decision', currency: 'JPY', impact: 'high' },
  { time: '23:50', utcHour: 23, utcMinute: 50, title: 'Japan GDP', currency: 'JPY', impact: 'high' },
  
  { time: '14:45', utcHour: 14, utcMinute: 45, title: 'BOC Rate Decision', currency: 'CAD', impact: 'high' },
  { time: '13:30', utcHour: 13, utcMinute: 30, title: 'Canada Employment', currency: 'CAD', impact: 'high' },
  
  { time: '03:30', utcHour: 3, utcMinute: 30, title: 'RBA Rate Decision', currency: 'AUD', impact: 'high' },
  { time: '00:30', utcHour: 0, utcMinute: 30, title: 'Australia Employment', currency: 'AUD', impact: 'high' },
  
  { time: '01:00', utcHour: 1, utcMinute: 0, title: 'RBNZ Rate Decision', currency: 'NZD', impact: 'high' },
  
  { time: '07:30', utcHour: 7, utcMinute: 30, title: 'SNB Rate Decision', currency: 'CHF', impact: 'high' },
];

function getMinutesSinceMidnightUTC(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function checkNewsFilter(symbol: string): NewsFilterResult {
  const now = new Date();
  const currentMinutes = getMinutesSinceMidnightUTC(now);
  const currentDayOfWeek = now.getUTCDay();
  const WINDOW_MINUTES = 30;

  const currencies = extractCurrencies(symbol);

  const nearbyEvents: NewsEvent[] = [];
  let closestMinutes: number | null = null;

  for (const event of HIGH_IMPACT_SCHEDULE) {
    if (event.impact !== 'high') continue;

    if (event.dayOfWeek !== undefined && event.dayOfWeek !== currentDayOfWeek) continue;

    if (!currencies.some(c => event.currency === c)) continue;

    const eventMinutes = event.utcHour * 60 + event.utcMinute;
    const rawDiff = eventMinutes - currentMinutes;
    const DAY_MINUTES = 1440;
    const absDiff = Math.min(
      Math.abs(rawDiff),
      Math.abs(rawDiff + DAY_MINUTES),
      Math.abs(rawDiff - DAY_MINUTES)
    );
    const diff = rawDiff;

    if (absDiff <= WINDOW_MINUTES) {
      nearbyEvents.push(event);
      if (closestMinutes === null || absDiff < Math.abs(closestMinutes)) {
        closestMinutes = diff;
      }
    }
  }

  const blocked = nearbyEvents.length > 0;
  let reason: string | null = null;

  if (blocked) {
    const eventNames = nearbyEvents.map(e => `${e.title} (${e.currency})`).join(', ');
    reason = `Важливі новини протягом 30хв: ${eventNames}`;
  }

  console.log(`[NEWS] ${symbol}: ${blocked ? `BLOCKED - ${reason}` : 'OK - немає новин'}`);

  return {
    blocked,
    nearbyEvents,
    reason,
    nextEventMinutes: closestMinutes,
  };
}

function extractCurrencies(symbol: string): string[] {
  const clean = symbol.replace('/', '');
  if (clean.length === 6) {
    return [clean.substring(0, 3), clean.substring(3, 6)];
  }
  return [clean];
}
