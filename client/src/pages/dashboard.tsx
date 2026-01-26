import { useSignals } from "@/hooks/use-signals";
import { usePairs } from "@/hooks/use-pairs";
import { SignalCard } from "@/components/signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Zap, TrendingUp, Clock, BarChart3, Brain, Sparkles, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export default function Dashboard() {
  const { data: signals, isLoading, refetch } = useSignals({ status: 'active' });
  const { data: pairs } = usePairs();
  const queryClient = useQueryClient();
  
  const [selectedPair, setSelectedPair] = useState<string>("");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [noEntryMessage, setNoEntryMessage] = useState("");

  // Poll for price updates every 5 seconds
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId: Number(selectedPair),
          timeframe: Number(selectedTimeframe),
        }),
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
  
  const timeframes = [
    { value: "1", label: "1 хв", category: "scalp" },
    { value: "2", label: "2 хв", category: "scalp" },
    { value: "3", label: "3 хв", category: "scalp" },
    { value: "4", label: "4 хв", category: "scalp" },
    { value: "5", label: "5 хв", category: "short" },
    { value: "10", label: "10 хв", category: "short" },
    { value: "15", label: "15 хв", category: "mid" },
    { value: "30", label: "30 хв", category: "mid" },
    { value: "60", label: "1 год", category: "long" },
    { value: "120", label: "2 год", category: "long" },
    { value: "180", label: "3 год", category: "long" },
    { value: "240", label: "4 год", category: "long" },
  ];

  const enabledPairs = pairs?.filter((p: any) => p.isEnabled) || [];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Brain className="text-purple-500" />
              DENI AI BOT
              <Sparkles className="text-yellow-500 h-5 w-5" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Валютні пари */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-500" />
                Валютна пара
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2">
                {enabledPairs.map((pair: any) => (
                  <motion.button
                    key={pair.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPair(String(pair.id))}
                    data-testid={`pair-${pair.symbol}`}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ${
                      selectedPair === String(pair.id)
                        ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/30'
                        : 'bg-muted/50 hover:bg-muted border-transparent hover:border-purple-500/30'
                    }`}
                  >
                    {pair.symbol.replace('/', '')}
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Експірація */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                Експірація
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
                {timeframes.map((tf) => (
                  <motion.button
                    key={tf.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedTimeframe(tf.value)}
                    data-testid={`timeframe-${tf.value}`}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ${
                      selectedTimeframe === tf.value
                        ? tf.category === 'scalp' 
                          ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30'
                          : tf.category === 'short'
                          ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30'
                          : tf.category === 'mid'
                          ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30'
                          : 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30'
                        : 'bg-muted/50 hover:bg-muted border-transparent hover:border-blue-500/30'
                    }`}
                  >
                    {tf.label}
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Скальпінг</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Короткострок</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Середньострок</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Довгострок</span>
              </div>
            </div>
            
            {/* Кнопка отримати сигнал */}
            <Button 
              size="lg" 
              className="w-full h-12 text-lg relative overflow-visible bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={handleGetSignal}
              disabled={!selectedPair || isGenerating}
              data-testid="button-get-signal"
            >
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Brain size={20} />
                    </motion.div>
                    AI Аналізує ринок...
                  </motion.div>
                ) : (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <Zap size={20} />
                    Отримати Сигнал
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
            
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-4"
              >
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    <Brain className="text-purple-500" size={20} />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">
                    Аналізуємо RSI, EMA50, EMA200, тренди та патерни...
                  </p>
                </div>
              </motion.div>
            )}

            {noEntryMessage && !isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-yellow-500/10 rounded-lg border-2 border-yellow-500/50"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-500 mt-1 shrink-0" size={24} />
                  <div>
                    <p className="font-bold text-lg text-yellow-500 mb-1">Точка входу не знайдена</p>
                    <p className="text-sm text-foreground">{noEntryMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {analysisText && !isGenerating && !noEntryMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-muted/50 rounded-lg border border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <Brain className="text-purple-500 mt-1 shrink-0" size={20} />
                  <div>
                    <p className="font-medium text-sm text-primary mb-1">AI Аналіз:</p>
                    <p className="text-sm text-foreground">{analysisText}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex items-center justify-between">
        <motion.h2 
          className="text-3xl font-bold tracking-tight"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          Активні Сигнали
        </motion.h2>
        <motion.div 
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-muted-foreground">Live (кожні 5 сек)</span>
        </motion.div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[280px] w-full rounded-xl" />
          ))}
        </div>
      ) : !signals || signals.length === 0 ? (
        <motion.div 
          className="text-center py-20 bg-muted/20 rounded-xl border border-dashed"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">Немає активних сигналів</p>
          <p className="text-sm text-muted-foreground mt-2">Оберіть пару та натисніть "Отримати Сигнал"</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {signals.map((signal: any, index: number) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
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
