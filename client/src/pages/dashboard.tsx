import { useSignals } from "@/hooks/use-signals";
import { usePairs } from "@/hooks/use-pairs";
import { SignalCard } from "@/components/signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Zap, TrendingUp, Clock, BarChart3, Brain, Sparkles } from "lucide-react";
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
      queryClient.invalidateQueries({ queryKey: [api.signals.list.path] });
      setAnalysisText(data.analysis || "");
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
    generateSignal.mutate();
  };

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 size={16} className="text-muted-foreground" />
                  Валютна пара
                </label>
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger data-testid="select-pair">
                    <SelectValue placeholder="Оберіть пару" />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledPairs.map((pair: any) => (
                      <SelectItem key={pair.id} value={String(pair.id)}>
                        {pair.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  Експірація
                </label>
                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger data-testid="select-timeframe">
                    <SelectValue placeholder="Оберіть час" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 хвилина</SelectItem>
                    <SelectItem value="2">2 хвилини</SelectItem>
                    <SelectItem value="3">3 хвилини</SelectItem>
                    <SelectItem value="4">4 хвилини</SelectItem>
                    <SelectItem value="5">5 хвилин</SelectItem>
                    <SelectItem value="10">10 хвилин</SelectItem>
                    <SelectItem value="15">15 хвилин</SelectItem>
                    <SelectItem value="30">30 хвилин</SelectItem>
                    <SelectItem value="60">1 година</SelectItem>
                    <SelectItem value="120">2 години</SelectItem>
                    <SelectItem value="180">3 години</SelectItem>
                    <SelectItem value="240">4 години</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  size="lg" 
                  className="w-full h-10 relative overflow-visible"
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
                          <Brain size={18} />
                        </motion.div>
                        AI Аналіз...
                      </motion.div>
                    ) : (
                      <motion.div
                        key="ready"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                      >
                        <Zap size={18} />
                        Отримати Сигнал
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            </div>
            
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

            {analysisText && !isGenerating && (
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
