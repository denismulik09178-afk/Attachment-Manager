import { getCurrencyInfo, getPairCurrencies } from "@/lib/currency-flags";

interface PairFlagProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PairFlag({ symbol, size = 'md' }: PairFlagProps) {
  const { base, quote } = getPairCurrencies(symbol);
  const baseInfo = getCurrencyInfo(base);
  const quoteInfo = getCurrencyInfo(quote);

  if (size === 'sm') {
    return (
      <div className="relative w-7 h-6" data-testid={`flag-${base}${quote}`}>
        <div className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center absolute left-0 top-0" style={{ zIndex: 2 }}>
          <div className={`w-full h-full rounded-full ${baseInfo.bg} flex items-center justify-center`}>
            <span className={`text-[6px] font-black ${baseInfo.text}`}>{baseInfo.code}</span>
          </div>
        </div>
        <div className="w-4 h-4 rounded-full border-2 border-background flex items-center justify-center absolute right-0 bottom-0" style={{ zIndex: 1 }}>
          <div className={`w-full h-full rounded-full ${quoteInfo.bg} flex items-center justify-center`}>
            <span className={`text-[5px] font-black ${quoteInfo.text}`}>{quoteInfo.code}</span>
          </div>
        </div>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className="relative w-11 h-10" data-testid={`flag-${base}${quote}`}>
        <div className="w-10 h-10 rounded-full border-2 border-background flex items-center justify-center absolute left-0 top-0" style={{ zIndex: 2 }}>
          <div className={`w-full h-full rounded-full ${baseInfo.bg} flex items-center justify-center`}>
            <span className={`text-[8px] font-black ${baseInfo.text}`}>{baseInfo.code}</span>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center absolute right-0 bottom-0" style={{ zIndex: 1 }}>
          <div className={`w-full h-full rounded-full ${quoteInfo.bg} flex items-center justify-center`}>
            <span className={`text-[5px] font-black ${quoteInfo.text}`}>{quoteInfo.code}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-9 h-8" data-testid={`flag-${base}${quote}`}>
      <div className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center absolute left-0 top-0" style={{ zIndex: 2 }}>
        <div className={`w-full h-full rounded-full ${baseInfo.bg} flex items-center justify-center`}>
          <span className={`text-[7px] font-black ${baseInfo.text}`}>{baseInfo.code}</span>
        </div>
      </div>
      <div className="w-5 h-5 rounded-full border-2 border-background flex items-center justify-center absolute right-0 bottom-0" style={{ zIndex: 1 }}>
        <div className={`w-full h-full rounded-full ${quoteInfo.bg} flex items-center justify-center`}>
          <span className={`text-[5px] font-black ${quoteInfo.text}`}>{quoteInfo.code}</span>
        </div>
      </div>
    </div>
  );
}
