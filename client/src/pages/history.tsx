import { useSignals, useSignalStats } from "@/hooks/use-signals";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { ArrowUp, ArrowDown, History, Trophy, XCircle, Minus, BarChart3, Target, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function HistoryPage() {
  const { data: signals, isLoading } = useSignals({ status: 'closed', limit: 50 });
  const { data: stats } = useSignalStats();

  const getResultConfig = (result: string) => {
    switch (result) {
      case 'WIN': return { label: 'Перемога', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', icon: Trophy };
      case 'LOSE': return { label: 'Програш', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/15', icon: XCircle };
      default: return { label: 'Нічия', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15', icon: Minus };
    }
  };

  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const winRate = stats?.winRate || 0;
  const total = stats?.totalSignals || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <History className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h2 className="section-title">Історія сигналів</h2>
          <p className="text-[9px] text-muted-foreground">Результати та статистика</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <div className="stat-card text-center">
          <BarChart3 className="w-3.5 h-3.5 text-blue-400 mx-auto" />
          <p className="text-sm font-bold">{total}</p>
          <p className="text-[8px] text-muted-foreground">Всього</p>
        </div>
        <div className="stat-card text-center">
          <Trophy className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
          <p className="text-sm font-bold text-emerald-400">{wins}</p>
          <p className="text-[8px] text-muted-foreground">Перемог</p>
        </div>
        <div className="stat-card text-center">
          <XCircle className="w-3.5 h-3.5 text-rose-400 mx-auto" />
          <p className="text-sm font-bold text-rose-400">{losses}</p>
          <p className="text-[8px] text-muted-foreground">Програшів</p>
        </div>
        <div className="stat-card text-center">
          <Target className="w-3.5 h-3.5 text-primary mx-auto" />
          <p className="text-sm font-bold text-primary">{winRate}%</p>
          <p className="text-[8px] text-muted-foreground">Win Rate</p>
        </div>
      </div>

      {stats?.byPair && Object.keys(stats.byPair).length > 0 && (
        <div className="glass-card p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-bold">Статистика по парах</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(stats.byPair).map(([symbol, data]: any) => (
              <div key={symbol} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[10px] font-semibold">{symbol}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground">{data.total}</span>
                  <span className={`text-[9px] font-bold ${data.winRate >= 60 ? 'text-emerald-400' : data.winRate >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {data.winRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : !signals || signals.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-2">
            <History className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Поки немає історії</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">Сигнали з'являться тут після закриття</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {signals.map((signal: any, index: number) => {
            const cfg = getResultConfig(signal.result);
            const isUp = signal.direction === 'UP';

            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`rounded-xl bg-card/60 border ${cfg.border} p-2.5 backdrop-blur-sm`}
                data-testid={`history-signal-${signal.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isUp ? 'bg-emerald-500/10 border border-emerald-500/15' : 'bg-rose-500/10 border border-rose-500/15'
                    }`}>
                      {isUp
                        ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                        : <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold">{signal.pair?.symbol}</p>
                        <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-3.5 border-transparent ${cfg.bg} ${cfg.color}`}>
                          <cfg.icon className="w-2 h-2 mr-0.5" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {signal.closeTime ? format(new Date(signal.closeTime), 'dd MMM, HH:mm', { locale: uk }) : '—'}
                        <span className="mx-1">·</span>
                        {signal.timeframe} хв
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 text-[10px]">
                      <div>
                        <p className="text-[8px] text-muted-foreground">Вхід</p>
                        <p className="font-mono font-semibold">{parseFloat(signal.openPrice).toFixed(5)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-muted-foreground">Закр.</p>
                        <p className="font-mono font-semibold">{signal.closePrice ? parseFloat(signal.closePrice).toFixed(5) : '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
