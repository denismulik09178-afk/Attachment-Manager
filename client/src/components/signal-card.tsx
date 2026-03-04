import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Trophy, XCircle, Timer, Clock, Target, TrendingUp, TrendingDown } from "lucide-react";
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
  const isJpy = signal.pair?.symbol?.includes('JPY');
  const pipSize = isJpy ? 0.01 : 0.0001;
  const pips = Math.abs(priceDiff / pipSize).toFixed(1);

  const closeSignal = useCallback(async () => {
    try {
      const res = await fetch(`/api/signals/${signal.id}/close`, { method: 'PATCH', credentials: 'include' });
      const data = await res.json();
      if (data.result === 'WIN') setResult('WIN');
      else if (data.result === 'LOSE') setResult('LOSE');
      else setResult('DRAW');
      setShowResult(true);
      setTimeout(() => { onClose?.(); }, 8000);
    } catch (e) { console.error("Failed to close signal", e); }
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
      if (remaining <= 0) { clearInterval(interval); closeSignal(); }
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
      WIN: { bg: 'from-emerald-500/15 to-emerald-500/5', border: 'border-emerald-500/40', icon: Trophy, color: 'text-emerald-400', label: 'ПЕРЕМОГА', glow: 'shadow-emerald-500/20' },
      LOSE: { bg: 'from-rose-500/15 to-rose-500/5', border: 'border-rose-500/40', icon: XCircle, color: 'text-rose-400', label: 'ПРОГРАШ', glow: 'shadow-rose-500/20' },
      DRAW: { bg: 'from-amber-500/15 to-amber-500/5', border: 'border-amber-500/40', icon: Timer, color: 'text-amber-400', label: 'НІЧИЯ', glow: 'shadow-amber-500/20' },
    };
    const cfg = resultConfig[result || 'DRAW'];

    return (
      <motion.div initial={{ scale: 1 }} animate={{ scale: [1, 1.01, 1] }} transition={{ duration: 0.3 }}>
        <div className={`rounded-2xl border ${cfg.border} bg-gradient-to-br ${cfg.bg} p-6 backdrop-blur-sm shadow-2xl ${cfg.glow}`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex flex-col items-center justify-center gap-2"
          >
            <cfg.icon className={`h-12 w-12 ${cfg.color}`} />
            <h2 className={`text-2xl font-black ${cfg.color}`}>{cfg.label}</h2>
            <p className="text-xs text-muted-foreground font-medium">{signal.pair?.symbol}</p>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-1">
              <span>Вхід: {openPrice.toFixed(5)}</span>
              <span>Закриття: {currentPrice.toFixed(5)}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  const urgencyClass = timeLeft <= 10 ? 'border-rose-500/30' : isUp ? 'border-emerald-500/10' : 'border-rose-500/10';

  return (
    <div className={`rounded-2xl bg-card/80 border ${urgencyClass} backdrop-blur-sm overflow-hidden shadow-xl`} data-testid={`signal-card-${signal.id}`}>
      <div className={`h-0.5 w-full ${isUp ? 'gradient-success' : 'gradient-danger'}`} />

      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isUp ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'
            }`}>
              {isUp
                ? <ArrowUp className="w-5 h-5 text-emerald-400" strokeWidth={3} />
                : <ArrowDown className="w-5 h-5 text-rose-400" strokeWidth={3} />
              }
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold">{signal.pair?.symbol}</p>
                <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-4 ${
                  isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {isUp ? 'ВГОРУ' : 'ВНИЗ'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-3.5 border-white/10 text-muted-foreground">
                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                  {formatTimeframe(signal.timeframe)}
                </Badge>
                <span className={`text-[9px] font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? '+' : '-'}{pips} піпсів
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <motion.p
              className={`text-xl font-mono font-black ${timeLeft <= 10 ? 'text-rose-400' : 'text-foreground'}`}
              animate={timeLeft <= 10 ? { scale: [1, 1.06, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              {formatTime(timeLeft)}
            </motion.p>
            <div className="h-1 w-16 bg-white/[0.04] rounded-full overflow-hidden mt-1 ml-auto">
              <motion.div
                className={`h-full rounded-full ${timeLeft <= 10 ? 'bg-rose-500' : isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg bg-white/[0.025] border border-white/[0.04] p-2">
            <p className="text-[8px] text-muted-foreground mb-0.5 flex items-center gap-0.5">
              <Target className="w-2.5 h-2.5" /> Вхід
            </p>
            <p className="text-[11px] font-mono font-bold">{openPrice.toFixed(5)}</p>
          </div>
          <div className="rounded-lg bg-white/[0.025] border border-white/[0.04] p-2">
            <p className="text-[8px] text-muted-foreground mb-0.5">Поточна</p>
            <motion.p
              className={`text-[11px] font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}
              key={currentPrice}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
            >
              {currentPrice.toFixed(5)}
            </motion.p>
          </div>
          <div className={`rounded-lg p-2 ${isProfit ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-rose-500/5 border border-rose-500/10'}`}>
            <p className="text-[8px] text-muted-foreground mb-0.5">P/L</p>
            <div className="flex items-center gap-0.5">
              {isProfit
                ? <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                : <TrendingDown className="w-2.5 h-2.5 text-rose-400" />
              }
              <p className={`text-[11px] font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfit ? '+' : '-'}{pips}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/[0.04]">
          <TradingViewWidget symbol={signal.pair?.symbol || 'EUR/USD'} height={160} />
        </div>

        {signal.analysis && (
          <div className="text-[10px] text-muted-foreground bg-white/[0.02] rounded-lg p-2 border border-white/[0.04]">
            <span className="font-bold text-primary">ШІ:</span> {signal.analysis}
          </div>
        )}
      </div>
    </div>
  );
}
