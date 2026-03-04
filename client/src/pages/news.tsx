import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  Globe, Clock, TrendingUp, TrendingDown, Gauge, 
  AlertTriangle, Calendar, Lightbulb, Radio, Flame, BarChart3, Moon
} from "lucide-react";
import { PairFlag } from "@/components/pair-flag";

export default function NewsPage() {
  const { data: marketData, isLoading } = useQuery({
    queryKey: ['/api/market/news'],
    queryFn: async () => {
      const res = await fetch('/api/market/news');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: overview } = useQuery({
    queryKey: ['/api/market/overview'],
    queryFn: async () => {
      const res = await fetch('/api/market/overview');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 10000,
  });

  const getVolatilityConfig = (v: string) => {
    switch (v) {
      case 'high': return { label: 'Висока', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', Icon: Flame };
      case 'medium': return { label: 'Середня', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', Icon: BarChart3 };
      default: return { label: 'Низька', color: 'text-muted-foreground', bg: 'bg-white/5 border-white/10', Icon: Moon };
    }
  };

  const getImpactConfig = (impact: string) => {
    switch (impact) {
      case 'high': return { label: 'Високий', color: 'text-rose-400', bg: 'bg-rose-500/10' };
      case 'medium': return { label: 'Середній', color: 'text-amber-400', bg: 'bg-amber-500/10' };
      default: return { label: 'Низький', color: 'text-muted-foreground', bg: 'bg-white/5' };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Globe className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h2 className="section-title">Огляд ринку</h2>
          <p className="text-[9px] text-muted-foreground">Сесії, новини та аналітика</p>
        </div>
      </div>

      {marketData && (
        <>
          <div className="glass-card-elevated p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-bold">Статус ринку</p>
              </div>
              <Badge variant="outline" className={`text-[9px] px-2 py-0.5 ${
                marketData.marketOpen
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {marketData.marketOpen ? 'Відкрито' : marketData.isWeekend ? 'Вихідний' : 'Закрито'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {marketData.sessions?.map((session: any) => (
                <div key={session.name} data-testid={`session-${session.name}`} className={`flex items-center justify-between p-2 rounded-lg border ${
                  session.status === 'active'
                    ? 'bg-emerald-500/5 border-emerald-500/15'
                    : 'bg-white/[0.02] border-white/[0.04]'
                }`}>
                  <span className="text-[10px] font-medium">{session.name}</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      session.status === 'active' ? 'bg-emerald-500' : 'bg-white/20'
                    }`} />
                    <span className={`text-[9px] font-medium ${
                      session.status === 'active' ? 'text-emerald-400' : 'text-muted-foreground/60'
                    }`}>
                      {session.status === 'active' ? 'Активна' : 'Закрита'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {(() => {
              const vcfg = getVolatilityConfig(marketData.volatility);
              return (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${vcfg.bg}`}>
                  <div className="flex items-center gap-2">
                    <Gauge className={`w-4 h-4 ${vcfg.color}`} />
                    <div>
                      <p className="text-[10px] font-semibold">Волатильність</p>
                      <p className={`text-[9px] ${vcfg.color}`}>{vcfg.label}</p>
                    </div>
                  </div>
                  <vcfg.Icon className={`w-5 h-5 ${vcfg.color}`} />
                </div>
              );
            })()}
          </div>

          {overview?.pairs?.length > 0 && (
            <div className="glass-card p-3 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-bold">Основні пари</p>
              </div>
              <div className="space-y-1.5">
                {overview.pairs.map((p: any) => {
                  const isPositive = parseFloat(p.change) >= 0;
                  return (
                    <div key={p.symbol} data-testid={`overview-pair-${p.symbol}`} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center gap-2.5">
                        <PairFlag symbol={p.symbol} size="md" />
                        <div>
                          <p className="text-xs font-semibold">{p.symbol}</p>
                          <p className={`text-[9px] font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 inline mr-0.5" />}
                            {isPositive ? '+' : ''}{p.change}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold">{p.price}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="glass-card p-3 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <p className="text-[11px] font-bold">Економічний календар</p>
            </div>
            <div className="space-y-1.5">
              {marketData.events?.map((event: any, i: number) => {
                const icfg = getImpactConfig(event.impact);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    data-testid={`event-${i}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 min-w-[40px]">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-mono text-muted-foreground">{event.time}</span>
                      </div>
                      <p className="text-[10px] font-medium">{event.title}</p>
                    </div>
                    <Badge variant="outline" className={`text-[8px] px-1.5 py-0 h-3.5 ${icfg.bg} ${icfg.color} border-transparent`}>
                      {event.impact === 'high' ? '!!!' : event.impact === 'medium' ? '!!' : '!'}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-amber-400 mb-0.5">Порада дня</p>
                <p className="text-[10px] text-foreground/70">{marketData.tip}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-3 h-24 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
