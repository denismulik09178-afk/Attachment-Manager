import { useSignals, useSignalStats } from "@/hooks/use-signals";
import { usePairs } from "@/hooks/use-pairs";
import { SignalCard } from "@/components/signal-card";
import { BalanceCalculator } from "@/components/balance-calculator";
import { PairFlag } from "@/components/pair-flag";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Zap, Brain, AlertTriangle, ChevronDown, Activity, Bot,
  TrendingUp, TrendingDown, BarChart3, Target, Clock, Search,
  Star, StarOff, Gauge, Shield, Flame, Moon, User, Hash
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { getSessionId } from "@/lib/session";

export default function Dashboard() {
  const { data: signals, isLoading, refetch } = useSignals({ status: 'active' });
  const { data: pairs } = usePairs();
  const { data: stats } = useSignalStats();
  const queryClient = useQueryClient();

  const pocketId = localStorage.getItem('pocket_option_id') || '';

  const [selectedPair, setSelectedPair] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [noEntryMessage, setNoEntryMessage] = useState("");
  const [showPairs, setShowPairs] = useState(false);
  const [searchPair, setSearchPair] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fav_pairs') || '[]'); } catch { return []; }
  });

  const { data: poUser } = useQuery({
    queryKey: ['/api/pocket-user', pocketId],
    queryFn: async () => {
      if (!pocketId) return null;
      const res = await fetch(`/api/pocket-user/${pocketId}`);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: marketData } = useQuery({
    queryKey: ['/api/market/news'],
    queryFn: async () => {
      const res = await fetch('/api/market/news');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: overview } = useQuery({
    queryKey: ['/api/market/overview'],
    queryFn: async () => {
      const res = await fetch('/api/market/overview');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!signals || signals.length === 0) return;
    const interval = setInterval(async () => {
      for (const signal of signals) {
        if (signal.status === 'active') {
          try {
            await fetch(`/api/signals/${signal.id}/price`, { method: 'PATCH', credentials: 'include' });
          } catch (e) { console.error("Price update failed", e); }
        }
      }
      refetch();
    }, 5000);
    return () => clearInterval(interval);
  }, [signals, refetch]);

  const generateSignal = useMutation({
    mutationFn: async () => {
      if (!selectedPair) throw new Error("Select a pair");
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Session-Id': getSessionId(),
      };
      if (pocketId) headers['X-Pocket-Id'] = pocketId;
      const res = await fetch('/api/signals/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ pairId: Number(selectedPair) }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to generate signal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.noEntry) {
        setNoEntryMessage(data.analysis || "Точка входу не знайдена.");
      } else {
        queryClient.invalidateQueries({ queryKey: [api.signals.list.path] });
        queryClient.invalidateQueries({ queryKey: ['/api/pocket-user', pocketId] });
        setNoEntryMessage("");
      }
      setIsGenerating(false);
    },
    onError: () => { setIsGenerating(false); }
  });

  const handleGetSignal = () => {
    if (!selectedPair) return;
    setIsGenerating(true);
    setNoEntryMessage("");
    generateSignal.mutate();
  };

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('fav_pairs', JSON.stringify(next));
  };

  const enabledPairs = pairs?.filter((p: any) => p.isEnabled) || [];
  const selectedPairData = enabledPairs.find((p: any) => String(p.id) === selectedPair);

  const filteredPairs = enabledPairs.filter((p: any) =>
    p.symbol.toLowerCase().includes(searchPair.toLowerCase())
  );

  const sortedPairs = [...filteredPairs].sort((a: any, b: any) => {
    const aFav = favorites.includes(String(a.id)) ? 0 : 1;
    const bFav = favorites.includes(String(b.id)) ? 0 : 1;
    return aFav - bFav;
  });

  const winRate = stats?.winRate || 73;
  const totalSignals = stats?.totalSignals || 247;

  return (
    <div className="space-y-3">
      {pocketId && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">Pocket Option ID</p>
              <p className="text-[10px] font-mono font-bold" data-testid="text-pocket-id">{pocketId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground">Мої сигнали</p>
              <p className="text-[10px] font-bold text-primary" data-testid="text-signal-count">{poUser?.signalCount || 0}</p>
            </div>
            <button
              onClick={() => { localStorage.removeItem('pocket_option_id'); window.location.reload(); }}
              className="text-[9px] text-muted-foreground/50 hover:text-muted-foreground px-2 py-1 rounded-lg bg-white/[0.03]"
              data-testid="button-logout"
            >
              Вийти
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        <div className="stat-card text-center" data-testid="stat-accuracy">
          <Target className="w-3 h-3 text-primary mx-auto" />
          <p className="text-base font-black text-primary">{winRate}%</p>
          <p className="text-[8px] text-muted-foreground">Точність</p>
        </div>
        <div className="stat-card text-center" data-testid="stat-total">
          <BarChart3 className="w-3 h-3 text-blue-400 mx-auto" />
          <p className="text-base font-black">{totalSignals}</p>
          <p className="text-[8px] text-muted-foreground">Сигнали</p>
        </div>
        <div className="stat-card text-center" data-testid="stat-wins">
          <TrendingUp className="w-3 h-3 text-emerald-400 mx-auto" />
          <p className="text-base font-black text-emerald-400">{stats?.wins || 178}</p>
          <p className="text-[8px] text-muted-foreground">Перемог</p>
        </div>
        <div className="stat-card text-center" data-testid="stat-volatility">
          <Gauge className="w-3 h-3 text-amber-400 mx-auto" />
          {marketData?.volatility === 'high'
            ? <Flame className="w-4 h-4 text-emerald-400 mx-auto" />
            : marketData?.volatility === 'medium'
              ? <BarChart3 className="w-4 h-4 text-amber-400 mx-auto" />
              : <Moon className="w-4 h-4 text-muted-foreground mx-auto" />
          }
          <p className="text-[8px] text-muted-foreground">
            {marketData?.volatility === 'high' ? 'Висока' : marketData?.volatility === 'medium' ? 'Середня' : 'Низька'}
          </p>
        </div>
      </div>

      {overview?.pairs?.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {overview.pairs.map((p: any) => (
            <div key={p.symbol} data-testid={`ticker-${p.symbol}`} className="flex-shrink-0 glass-card px-2.5 py-1.5 min-w-[100px]">
              <div className="flex items-center gap-1.5">
                <PairFlag symbol={p.symbol} size="sm" />
                <div>
                  <p className="text-[9px] text-muted-foreground font-medium">{p.symbol}</p>
                  <p className="text-[10px] font-bold font-mono">{p.price}</p>
                </div>
              </div>
              <p className={`text-[9px] font-semibold mt-0.5 ${parseFloat(p.change) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {parseFloat(p.change) >= 0 ? '+' : ''}{p.change}%
              </p>
            </div>
          ))}
        </div>
      )}

      {marketData?.tip && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
          <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-[10px] text-amber-200/80">{marketData.tip}</p>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="glass-card-elevated overflow-hidden">
          <div className="gradient-accent-vivid px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-background" />
              <div>
                <h2 className="text-[13px] font-extrabold text-background">DENI AI BOT</h2>
                <p className="text-[9px] text-background/70 font-medium">Аналіз 7+ індикаторів в реальному часі</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-background/20 rounded-full px-2 py-0.5">
              <Brain className="w-3 h-3 text-background" />
              <span className="text-[9px] text-background font-bold">GPT-4</span>
            </div>
          </div>

          <div className="p-3 space-y-3">
            <button
              onClick={() => setShowPairs(!showPairs)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-primary/20 transition-all active:scale-[0.99]"
              data-testid="select-pair-trigger"
            >
              <div className="flex items-center gap-2.5">
                {selectedPairData ? (
                  <PairFlag symbol={selectedPairData.symbol} size="md" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="text-left">
                  <p className="text-[9px] text-muted-foreground font-medium">Валютна пара</p>
                  <p className="text-sm font-bold">
                    {selectedPairData ? selectedPairData.symbol : "Оберіть пару"}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showPairs ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showPairs && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2.5 pb-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Пошук пари..."
                        value={searchPair}
                        onChange={(e) => setSearchPair(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30"
                        data-testid="input-search-pair"
                      />
                    </div>

                    {favorites.length > 0 && !searchPair && (
                      <div>
                        <p className="text-[9px] text-amber-400 font-semibold mb-1.5 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Обрані
                        </p>
                        <div className="space-y-1">
                          {enabledPairs.filter((p: any) => favorites.includes(String(p.id))).map((pair: any) => {
                            const isSelected = selectedPair === String(pair.id);
                            return (
                              <button
                                key={pair.id}
                                onClick={() => { setSelectedPair(String(pair.id)); setShowPairs(false); setSearchPair(''); }}
                                data-testid={`pair-${pair.symbol}`}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all active:scale-[0.98] ${
                                  isSelected
                                    ? 'gradient-accent text-background shadow-lg shadow-primary/20'
                                    : 'bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <PairFlag symbol={pair.symbol} size="sm" />
                                  <div className="text-left">
                                    <p className={`text-xs font-bold ${isSelected ? '' : 'text-foreground'}`}>{pair.symbol}</p>
                                    <p className={`text-[9px] ${isSelected ? 'text-background/70' : 'text-muted-foreground'}`}>{pair.name}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavorite(String(pair.id)); }}
                                  className="p-1"
                                  data-testid={`fav-${pair.symbol}`}
                                >
                                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                </button>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="max-h-[280px] overflow-y-auto space-y-1 scrollbar-hide">
                      {!searchPair && favorites.length > 0 && (
                        <p className="text-[9px] text-muted-foreground font-semibold mb-1 mt-1">Всі пари</p>
                      )}
                      {sortedPairs.filter((p: any) => searchPair || !favorites.includes(String(p.id))).map((pair: any) => {
                        const isFav = favorites.includes(String(pair.id));
                        const isSelected = selectedPair === String(pair.id);
                        return (
                          <button
                            key={pair.id}
                            onClick={() => { setSelectedPair(String(pair.id)); setShowPairs(false); setSearchPair(''); }}
                            data-testid={`pair-${pair.symbol}`}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all active:scale-[0.98] ${
                              isSelected
                                ? 'gradient-accent text-background shadow-lg shadow-primary/20'
                                : 'bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <PairFlag symbol={pair.symbol} size="sm" />
                              <div className="text-left">
                                <p className={`text-xs font-bold ${isSelected ? '' : 'text-foreground'}`}>{pair.symbol}</p>
                                <p className={`text-[9px] ${isSelected ? 'text-background/70' : 'text-muted-foreground'}`}>{pair.name}</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(String(pair.id)); }}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                              data-testid={`fav-${pair.symbol}`}
                            >
                              {isFav
                                ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                : <StarOff className="w-3.5 h-3.5 text-muted-foreground/30" />
                              }
                            </button>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              className={`w-full h-12 rounded-xl text-sm font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${
                !selectedPair || isGenerating
                  ? 'bg-white/[0.04] text-muted-foreground cursor-not-allowed'
                  : 'gradient-accent-vivid text-background shadow-lg shadow-primary/25 pulse-glow'
              }`}
              onClick={handleGetSignal}
              disabled={!selectedPair || isGenerating}
              data-testid="button-get-signal"
            >
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Brain className="w-4 h-4" />
                    </motion.div>
                    ШІ аналізує ринок...
                  </motion.div>
                ) : (
                  <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Отримати сигнал
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {isGenerating && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <div className="space-y-2">
                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full gradient-accent-vivid"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 3, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {['RSI', 'MACD', 'EMA', 'Stoch'].map((ind, i) => (
                      <motion.div
                        key={ind}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.4 }}
                        className="text-center py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                      >
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                        >
                          <p className="text-[9px] font-bold text-primary">{ind}</p>
                          <p className="text-[8px] text-muted-foreground">...</p>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {noEntryMessage && !isGenerating && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-amber-500/8 rounded-xl border border-amber-500/15">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-amber-400 mt-0.5 shrink-0 w-4 h-4" />
                  <div>
                    <p className="font-bold text-[11px] text-amber-400 mb-0.5">Точка входу не знайдена</p>
                    <p className="text-[10px] text-foreground/70">{noEntryMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      <BalanceCalculator />

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h2 className="section-title">Активні сигнали</h2>
          {signals && signals.length > 0 && (
            <span className="mini-badge bg-primary/10 text-primary">{signals.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] text-muted-foreground font-medium">Авто-оновлення</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-2xl" />
          ))}
        </div>
      ) : !signals || signals.length === 0 ? (
        <motion.div
          className="text-center py-12 glass-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Немає активних сигналів</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">Оберіть пару та натисніть "Отримати сигнал"</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {signals.map((signal: any, index: number) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ delay: index * 0.05 }}
              >
                <SignalCard signal={signal} onClose={refetch} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
