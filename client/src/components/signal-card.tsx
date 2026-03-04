import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Trophy, XCircle, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { TradingViewWidget } from "./tradingview-widget";

interface SignalCardProps {
  signal: any;
  onClose?: () => void;
}

export function SignalCard({ signal, onClose }: SignalCardProps) {
  const isUp = signal.direction === 'UP';

  const formatTimeframe = (mins: number) => {
    if (mins >= 60) {
      const hours = mins / 60;
      return hours === 1 ? '1 год' : `${hours} год`;
    }
    return `${mins} хв`;
  };

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<'WIN' | 'LOSE' | 'DRAW' | null>(null);

  const openPrice = parseFloat(signal.openPrice);
  const currentPrice = parseFloat(signal.currentPrice || signal.openPrice);
  const priceDiff = currentPrice - openPrice;
  const isProfit = isUp ? priceDiff > 0 : priceDiff < 0;

  const closeSignal = useCallback(async () => {
    try {
      const res = await fetch(`/api/signals/${signal.id}/close`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();

      if (data.result === 'WIN') setResult('WIN');
      else if (data.result === 'LOSE') setResult('LOSE');
      else setResult('DRAW');
      setShowResult(true);

      setTimeout(() => { onClose?.(); }, 8000);
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
    const resultConfig = {
      WIN: { bg: 'from-emerald-500/20 to-emerald-500/5', border: 'border-emerald-500/50', icon: Trophy, color: 'text-emerald-400', label: 'ПЕРЕМОГА' },
      LOSE: { bg: 'from-rose-500/20 to-rose-500/5', border: 'border-rose-500/50', icon: XCircle, color: 'text-rose-400', label: 'ПРОГРАШ' },
      DRAW: { bg: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/50', icon: Timer, color: 'text-amber-400', label: 'НІЧИЯ' },
    };
    const cfg = resultConfig[result || 'DRAW'];

    return (
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 0.4 }}
      >
        <div className={`rounded-2xl border-2 ${cfg.border} bg-gradient-to-br ${cfg.bg} p-6 backdrop-blur-sm`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex flex-col items-center justify-center gap-3"
          >
            <cfg.icon className={`h-14 w-14 ${cfg.color}`} />
            <h2 className={`text-3xl font-bold ${cfg.color}`}>{cfg.label}</h2>
            <p className="text-sm text-muted-foreground">{signal.pair?.symbol}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span>Вхід: {openPrice.toFixed(5)}</span>
              <span>Закриття: {currentPrice.toFixed(5)}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl bg-card/80 border border-white/[0.06] backdrop-blur-sm overflow-hidden" data-testid={`signal-card-${signal.id}`}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isUp ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-rose-500/15 border border-rose-500/30'
            }`}>
              {isUp
                ? <ArrowUp className="w-5 h-5 text-emerald-400" />
                : <ArrowDown className="w-5 h-5 text-rose-400" />
              }
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{signal.pair?.symbol}</p>
              <p className={`text-base font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? 'ВГОРУ' : 'ВНИЗ'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <Badge variant="outline" className="text-[10px] mb-1 border-white/10 text-muted-foreground">
              {formatTimeframe(signal.timeframe)}
            </Badge>
            <motion.p
              className={`text-lg font-mono font-bold ${timeLeft <= 10 ? 'text-rose-400' : 'text-foreground'}`}
              animate={timeLeft <= 10 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              {formatTime(timeLeft)}
            </motion.p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Ціна входу</p>
            <p className="text-sm font-mono font-semibold">{openPrice.toFixed(5)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-2.5">
            <p className="text-[10px] text-muted-foreground mb-0.5">Поточна ціна</p>
            <motion.p
              className={`text-sm font-mono font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}
              key={currentPrice}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
            >
              {currentPrice.toFixed(5)}
            </motion.p>
          </div>
        </div>

        <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${timeLeft <= 10 ? 'bg-rose-500' : isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
            initial={{ width: "100%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </div>

        <div className="rounded-xl overflow-hidden border border-white/[0.04]">
          <TradingViewWidget symbol={signal.pair?.symbol || 'EUR/USD'} height={180} />
        </div>

        {signal.analysis && (
          <div className="text-[11px] text-muted-foreground bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
            <span className="font-medium text-primary">ШІ:</span> {signal.analysis}
          </div>
        )}
      </div>
    </div>
  );
}
