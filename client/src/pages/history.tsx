import { useSignals } from "@/hooks/use-signals";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { ArrowUp, ArrowDown, History, Trophy, XCircle, Minus } from "lucide-react";
import { motion } from "framer-motion";

export default function HistoryPage() {
  const { data: signals, isLoading } = useSignals({ status: 'closed', limit: 50 });

  const getResultConfig = (result: string) => {
    switch (result) {
      case 'WIN': return { label: 'Перемога', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Trophy };
      case 'LOSE': return { label: 'Програш', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: XCircle };
      default: return { label: 'Нічия', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Minus };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <History className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold">Історія сигналів</h2>
          <p className="text-[10px] text-muted-foreground">Останні 50 результатів</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !signals || signals.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-card/40 border border-white/[0.04]">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Поки немає історії</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Сигнали з'являться тут після закриття</p>
        </div>
      ) : (
        <div className="space-y-2">
          {signals.map((signal: any, index: number) => {
            const cfg = getResultConfig(signal.result);
            const isUp = signal.direction === 'UP';

            return (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-xl bg-card/60 border border-white/[0.04] p-3 backdrop-blur-sm"
                data-testid={`history-signal-${signal.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isUp ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'
                    }`}>
                      {isUp
                        ? <ArrowUp className="w-4 h-4 text-emerald-400" />
                        : <ArrowDown className="w-4 h-4 text-rose-400" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{signal.pair?.symbol}</p>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {signal.closeTime ? format(new Date(signal.closeTime), 'dd MMM, HH:mm', { locale: uk }) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-3 text-xs">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Вхід</p>
                        <p className="font-mono font-medium">{parseFloat(signal.openPrice).toFixed(5)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground">Закриття</p>
                        <p className="font-mono font-medium">{signal.closePrice ? parseFloat(signal.closePrice).toFixed(5) : '—'}</p>
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
