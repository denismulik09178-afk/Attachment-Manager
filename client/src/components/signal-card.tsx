import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Clock, DollarSign, TrendingUp, TrendingDown, Trophy, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { TradingViewWidget } from "./tradingview-widget";

interface SignalCardProps {
  signal: any;
  onClose?: () => void;
}

export function SignalCard({ signal, onClose }: SignalCardProps) {
  const isUp = signal.direction === 'UP';
  const color = isUp ? "#22c55e" : "#ef4444";
  const bgGradient = isUp 
    ? "from-green-500/10 to-green-500/5" 
    : "from-red-500/10 to-red-500/5";
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<'WIN' | 'LOSE' | 'DRAW' | null>(null);

  const openPrice = parseFloat(signal.openPrice);
  const currentPrice = parseFloat(signal.currentPrice || signal.openPrice);
  const priceDiff = currentPrice - openPrice;
  
  // Правильна логіка: UP виграє якщо ціна зросла, DOWN виграє якщо ціна впала
  const isWinning = signal.direction === 'UP' ? currentPrice > openPrice : currentPrice < openPrice;

  const closeSignal = useCallback(async () => {
    try {
      const res = await fetch(`/api/signals/${signal.id}/close`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.result === 'WIN') {
        setResult('WIN');
      } else if (data.result === 'LOSE') {
        setResult('LOSE');
      } else {
        setResult('DRAW');
      }
      setShowResult(true);
      
      setTimeout(() => {
        onClose?.();
      }, 3000);
    } catch (e) {
      console.error("Failed to close signal", e);
    }
  }, [signal.id, onClose]);

  useEffect(() => {
    if (signal.status !== 'active') return;
    
    const openTime = new Date(signal.openTime).getTime();
    const durationMs = signal.timeframe * 60 * 1000;
    const expiryTime = openTime + durationMs;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiryTime - now) / 1000));
      const totalSeconds = signal.timeframe * 60;
      
      setTimeLeft(remaining);
      setProgress((remaining / totalSeconds) * 100);
      
      if (remaining <= 0) {
        clearInterval(interval);
        closeSignal();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [signal, closeSignal]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showResult) {
    return (
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.5 }}
      >
        <Card className={`overflow-hidden border-4 ${result === 'WIN' ? 'border-green-500 bg-green-500/20' : result === 'LOSE' ? 'border-red-500 bg-red-500/20' : 'border-yellow-500 bg-yellow-500/20'}`}>
          <CardContent className="py-12">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex flex-col items-center justify-center"
            >
              {result === 'WIN' ? (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    <Trophy className="h-20 w-20 text-green-500" />
                  </motion.div>
                  <motion.h2 
                    className="text-4xl font-bold text-green-500 mt-4"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  >
                    WIN!
                  </motion.h2>
                </>
              ) : result === 'LOSE' ? (
                <>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  >
                    <XCircle className="h-20 w-20 text-red-500" />
                  </motion.div>
                  <h2 className="text-4xl font-bold text-red-500 mt-4">LOSE</h2>
                </>
              ) : (
                <>
                  <div className="h-20 w-20 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">=</span>
                  </div>
                  <h2 className="text-4xl font-bold text-yellow-500 mt-4">DRAW</h2>
                </>
              )}
              <p className="text-muted-foreground mt-2">{signal.pair?.symbol}</p>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span>Вхід: {openPrice.toFixed(5)}</span>
                <span>Закриття: {currentPrice.toFixed(5)}</span>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <Card 
      className={`overflow-hidden border-l-4 bg-gradient-to-br ${bgGradient}`}
      style={{ borderLeftColor: color }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
        <CardTitle className="text-lg font-bold truncate">
          {signal.pair?.symbol || "Unknown Pair"}
        </CardTitle>
        <Badge 
          className="gap-1 text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {signal.direction}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign size={12} /> Точка входу
            </p>
            <p className="text-xl font-mono font-bold">{openPrice.toFixed(5)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Clock size={12} /> Експірація
            </p>
            <motion.p 
              className="text-xl font-mono font-bold"
              style={{ color }}
              animate={{ scale: timeLeft <= 10 ? [1, 1.1, 1] : 1 }}
              transition={{ repeat: timeLeft <= 10 ? Infinity : 0, duration: 0.5 }}
            >
              {formatTime(timeLeft)}
            </motion.p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Поточна ціна:</span>
            <div className="flex items-center gap-2">
              <motion.span 
                className="font-mono font-bold text-lg"
                key={currentPrice}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
              >
                {currentPrice.toFixed(5)}
              </motion.span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={isWinning ? 'win' : 'lose'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {isWinning ? (
                    <TrendingUp className="text-green-500" size={20} />
                  ) : (
                    <TrendingDown className="text-red-500" size={20} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-muted-foreground">Різниця:</span>
            <span className={`font-mono text-sm font-bold ${priceDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(5)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={`inline-flex items-center justify-center w-14 h-14 rounded-full border-4 ${isWinning ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}
          >
            <motion.div
              animate={{ 
                y: isUp ? [-2, 2, -2] : [2, -2, 2],
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              {isUp ? (
                <ArrowUp size={28} className={isWinning ? 'text-green-500' : 'text-red-500'} />
              ) : (
                <ArrowDown size={28} className={isWinning ? 'text-green-500' : 'text-red-500'} />
              )}
            </motion.div>
          </motion.div>
          <p className={`text-lg font-bold ${isWinning ? 'text-green-500' : 'text-red-500'}`}>
            {isWinning ? 'В ПЛЮСІ' : 'В МІНУСІ'}
          </p>
        </div>

        <div className="rounded-lg overflow-hidden border border-border">
          <TradingViewWidget symbol={signal.pair?.symbol || 'EUR/USD'} height={250} />
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Прогрес</span>
            <span>{signal.timeframe}хв</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full rounded-full"
              style={{ backgroundColor: timeLeft <= 10 ? '#ef4444' : color }}
              initial={{ width: "100%" }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          </div>
        </div>

        {signal.analysis && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 mt-2">
            <span className="font-medium text-primary">AI:</span> {signal.analysis}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
