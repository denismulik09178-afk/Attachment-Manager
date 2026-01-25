import { useSignals } from "@/hooks/use-signals";
import { usePairs } from "@/hooks/use-pairs";
import { SignalCard } from "@/components/signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Zap, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export default function Dashboard() {
  const { data: signals, isLoading } = useSignals({ status: 'active' });
  const { data: pairs } = usePairs();
  const queryClient = useQueryClient();
  
  const [selectedPair, setSelectedPair] = useState<string>("");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("1");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSignal = useMutation({
    mutationFn: async () => {
      if (!selectedPair) throw new Error("Select a pair");
      
      const directions = ['UP', 'DOWN'];
      const randomDirection = directions[Math.floor(Math.random() * 2)];
      const basePrice = 1.0500 + Math.random() * 0.01;
      
      const sparkline = Array.from({ length: 6 }, () => 
        basePrice + (Math.random() - 0.5) * 0.002
      );

      const res = await fetch(api.signals.create.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId: Number(selectedPair),
          direction: randomDirection,
          timeframe: Number(selectedTimeframe),
          openPrice: basePrice.toFixed(4),
          sparklineData: sparkline,
        }),
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error("Failed to create signal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.signals.list.path] });
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const handleGetSignal = () => {
    if (!selectedPair) return;
    setIsGenerating(true);
    setTimeout(() => {
      generateSignal.mutate();
    }, 1500);
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
              <Zap className="text-yellow-500" />
              Генератор Сигналів
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
                    <SelectItem value="3">3 хвилини</SelectItem>
                    <SelectItem value="5">5 хвилин</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  size="lg" 
                  className="w-full h-10 relative overflow-hidden"
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
                          <TrendingUp size={18} />
                        </motion.div>
                        Аналіз...
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
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Аналізуємо RSI, EMA50, EMA200...
                </p>
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
          <span className="text-sm text-muted-foreground">Live Feed</span>
        </motion.div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
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
                <SignalCard signal={signal} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
