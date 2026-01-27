import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Clock, DollarSign, Trophy, XCircle } from "lucide-react";
import { motion } from "framer-motion";
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
  
  // Форматуємо таймфрейм для відображення
  const formatTimeframe = (mins: number) => {
    if (mins >= 60) {
      const hours = mins / 60;
      return hours === 1 ? '1 годину' : `${hours} години`;
    }
    return `${mins} хв`;
  };
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<'WIN' | 'LOSE' | 'DRAW' | null>(null);

  const openPrice = parseFloat(signal.openPrice);
  const currentPrice = parseFloat(signal.currentPrice || signal.openPrice);

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
      
      // Показуємо результат 8 секунд перед закриттям
      setTimeout(() => {
        onClose?.();
      }, 8000);
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
      <CardHeader className="pb-2">
        {/* Головний напрямок з таймфреймом */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="flex items-center justify-center w-12 h-12 rounded-full"
              style={{ backgroundColor: `${color}20`, borderColor: color, borderWidth: 2 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {isUp ? <ArrowUp size={24} style={{ color }} /> : <ArrowDown size={24} style={{ color }} />}
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">{signal.pair?.symbol}</p>
              <p className="text-xl font-bold" style={{ color }}>
                {isUp ? 'ВВЕРХ' : 'ВНИЗ'} на {formatTimeframe(signal.timeframe)}
              </p>
            </div>
          </div>
          
          {/* Таймер збоку */}
          <div className="text-right">
            <motion.div
              className="text-2xl font-mono font-bold"
              style={{ color: timeLeft <= 10 ? '#ef4444' : color }}
              animate={{ scale: timeLeft <= 10 ? [1, 1.1, 1] : 1 }}
              transition={{ repeat: timeLeft <= 10 ? Infinity : 0, duration: 0.5 }}
            >
              {formatTime(timeLeft)}
            </motion.div>
            <p className="text-xs text-muted-foreground">залишилось</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center bg-muted/30 rounded-lg p-3">
          <div>
            <p className="text-xs text-muted-foreground">Вхід</p>
            <p className="text-lg font-mono font-bold">{openPrice.toFixed(5)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Поточна</p>
            <motion.p 
              className="text-lg font-mono font-bold"
              key={currentPrice}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {currentPrice.toFixed(5)}
            </motion.p>
          </div>
        </div>

        {/* Прогрес бар */}
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full rounded-full"
            style={{ backgroundColor: timeLeft <= 10 ? '#ef4444' : color }}
            initial={{ width: "100%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </div>

        <div className="rounded-lg overflow-hidden border border-border">
          <TradingViewWidget symbol={signal.pair?.symbol || 'EUR/USD'} height={220} />
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
