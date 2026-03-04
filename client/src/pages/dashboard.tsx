import { useSignals } from "@/hooks/use-signals";
import { usePairs } from "@/hooks/use-pairs";
import { SignalCard } from "@/components/signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Zap, Brain, AlertTriangle, ChevronDown, Activity, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { getSessionId } from "@/lib/session";

export default function Dashboard() {
  const { data: signals, isLoading, refetch } = useSignals({ status: 'active' });
  const { data: pairs } = usePairs();
  const queryClient = useQueryClient();

  const [selectedPair, setSelectedPair] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [noEntryMessage, setNoEntryMessage] = useState("");
  const [showPairs, setShowPairs] = useState(false);

  useEffect(() => {
    if (!signals || signals.length === 0) return;

    const interval = setInterval(async () => {
      for (const signal of signals) {
        if (signal.status === 'active') {
          try {
            await fetch(`/api/signals/${signal.id}/price`, {
              method: 'PATCH',
              credentials: 'include',
            });
          } catch (e) {
            console.error("Price update failed", e);
          }
        }
      }
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [signals, refetch]);

  const generateSignal = useMutation({
    mutationFn: async () => {
      if (!selectedPair) throw new Error("Select a pair");

      const res = await fetch('/api/signals/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': getSessionId(),
        },
        body: JSON.stringify({ pairId: Number(selectedPair) }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error("Failed to generate signal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.noEntry) {
        setNoEntryMessage(data.analysis || "Точка входу не знайдена. Індикатори не дають чіткого сигналу.");
        setAnalysisText("");
      } else {
        queryClient.invalidateQueries({ queryKey: [api.signals.list.path] });
        setAnalysisText(data.analysis || "");
        setNoEntryMessage("");
      }
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const handleGetSignal = () => {
    if (!selectedPair) return;
    setIsGenerating(true);
    setAnalysisText("");
    setNoEntryMessage("");
    generateSignal.mutate();
  };

  const enabledPairs = pairs?.filter((p: any) => p.isEnabled) || [];
  const selectedPairData = enabledPairs.find((p: any) => String(p.id) === selectedPair);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="glass-card-elevated rounded-2xl overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold">ШІ Генератор Сигналів</h2>
                <p className="text-[10px] text-muted-foreground">Аналіз RSI, EMA, тренди та патерни</p>
              </div>
            </div>

            <button
              onClick={() => setShowPairs(!showPairs)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-primary/30 transition-colors"
              data-testid="select-pair-trigger"
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-primary" />
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground">Валютна пара</p>
                  <p className="text-sm font-semibold">
                    {selectedPairData ? selectedPairData.symbol : "Оберіть пару"}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showPairs ? 'rotate-180' : ''}`} />
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
                  <div className="grid grid-cols-3 gap-1.5 pb-1">
                    {enabledPairs.map((pair: any) => (
                      <button
                        key={pair.id}
                        onClick={() => { setSelectedPair(String(pair.id)); setShowPairs(false); }}
                        data-testid={`pair-${pair.symbol}`}
                        className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                          selectedPair === String(pair.id)
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-white/[0.03] text-muted-foreground border border-white/[0.04] hover:border-white/[0.1]'
                        }`}
                      >
                        {pair.symbol}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              className="w-full h-12 text-sm font-semibold gradient-accent hover:opacity-90 transition-opacity rounded-xl border-0"
              onClick={handleGetSignal}
              disabled={!selectedPair || isGenerating}
              data-testid="button-get-signal"
            >
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Brain className="w-4 h-4" />
                    </motion.div>
                    ШІ аналізує ринок...
                  </motion.div>
                ) : (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Отримати сигнал
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full gradient-accent"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                    <Brain className="text-primary w-3.5 h-3.5" />
                  </motion.div>
                  <p className="text-[11px] text-muted-foreground">
                    ШІ аналізує RSI, EMA50, EMA200, тренди та патерни...
                  </p>
                </div>
              </motion.div>
            )}

            {noEntryMessage && !isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-400 mt-0.5 shrink-0 w-4 h-4" />
                  <div>
                    <p className="font-semibold text-xs text-amber-400 mb-0.5">Точка входу не знайдена</p>
                    <p className="text-[11px] text-foreground/80">{noEntryMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {analysisText && !isGenerating && !noEntryMessage && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-primary/5 rounded-xl border border-primary/10"
              >
                <div className="flex items-start gap-2.5">
                  <Brain className="text-primary mt-0.5 shrink-0 w-4 h-4" />
                  <div>
                    <p className="font-semibold text-xs text-primary mb-0.5">ШІ Аналіз</p>
                    <p className="text-[11px] text-foreground/80">{analysisText}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Активні сигнали</h2>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] text-muted-foreground">Оновлення кожні 5 сек</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-[180px] w-full rounded-2xl" />
          ))}
        </div>
      ) : !signals || signals.length === 0 ? (
        <motion.div
          className="text-center py-16 rounded-2xl bg-card/40 border border-white/[0.04]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Немає активних сигналів</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Оберіть пару та натисніть "Отримати сигнал"</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {signals.map((signal: any, index: number) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
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
