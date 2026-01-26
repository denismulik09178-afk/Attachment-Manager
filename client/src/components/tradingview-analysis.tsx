import { useEffect, useRef, memo } from "react";

interface TradingViewAnalysisProps {
  symbol: string;
  height?: number;
}

export const TradingViewAnalysis = memo(function TradingViewAnalysis({ 
  symbol, 
  height = 400 
}: TradingViewAnalysisProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const tvSymbol = symbol.includes('/') 
    ? `FX:${symbol.replace('/', '')}` 
    : `FX:${symbol}`;

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: "1m",
      width: "100%",
      isTransparent: true,
      height: height,
      symbol: tvSymbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "uk",
      colorTheme: "dark"
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tvSymbol, height]);

  return (
    <div 
      ref={containerRef}
      className="tradingview-widget-container rounded-lg overflow-hidden"
      data-testid="tradingview-analysis"
    />
  );
});
