import { useSignals } from "@/hooks/use-signals";
import { usePairs } from "@/hooks/use-pairs";
import { SignalCard } from "@/components/signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Zap, TrendingUp, Clock, BarChart3, Brain, Sparkles, AlertTriangle, ChevronDown } from "lucide-react";
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
  const [pairOpen, setPairOpen] = useState(false);
  const [timeframeOpen, setTimeframeOpen] = useState(false);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Валютна пара - Popover */}
              <Popover open={pairOpen} onOpenChange={setPairOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-14 justify-between text-left font-normal border-2 hover:border-purple-500"
                    data-testid="select-pair-trigger"
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 size={20} className="text-purple-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Валютна пара</p>
                        <p className="font-bold text-lg">
                          {selectedPair ? enabledPairs.find((p: any) => String(p.id) === selectedPair)?.symbol : "Оберіть пару"}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={20} className="text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="grid grid-cols-3 gap-2">
                    {enabledPairs.map((pair: any) => (
                      <Button
                        key={pair.id}
                        variant={selectedPair === String(pair.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setSelectedPair(String(pair.id)); setPairOpen(false); }}
                        data-testid={`pair-${pair.symbol}`}
                        className={selectedPair === String(pair.id) ? "bg-purple-500 hover:bg-purple-600" : ""}
                      >
                        {pair.symbol}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Експірація - Popover */}
              <Popover open={timeframeOpen} onOpenChange={setTimeframeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-14 justify-between text-left font-normal border-2 hover:border-blue-500"
                    data-testid="select-timeframe-trigger"
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={20} className="text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Експірація</p>
                        <p className="font-bold text-lg">
                          {timeframes.find(t => t.value === selectedTimeframe)?.label || "1 хв"}
                        </p>
                      </div>
                    </div>
                    <ChevronDown size={20} className="text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Скальпінг</p>
                    <div className="grid grid-cols-4 gap-2">
                      {timeframes.filter(t => t.category === 'scalp').map((tf) => (
                        <Button
                          key={tf.value}
                          variant={selectedTimeframe === tf.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => { setSelectedTimeframe(tf.value); setTimeframeOpen(false); }}
                          data-testid={`timeframe-${tf.value}`}
                          className={selectedTimeframe === tf.value ? "bg-red-500 hover:bg-red-600" : ""}
                        >
                          {tf.label}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium pt-2">Короткострок</p>
                    <div className="grid grid-cols-4 gap-2">
                      {timeframes.filter(t => t.category === 'short').map((tf) => (
                        <Button
                          key={tf.value}
                          variant={selectedTimeframe === tf.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => { setSelectedTimeframe(tf.value); setTimeframeOpen(false); }}
                          className={selectedTimeframe === tf.value ? "bg-orange-500 hover:bg-orange-600" : ""}
                        >
                          {tf.label}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium pt-2">Середньо/Довгострок</p>
                    <div className="grid grid-cols-4 gap-2">
                      {timeframes.filter(t => t.category === 'mid' || t.category === 'long').map((tf) => (
                        <Button
                          key={tf.value}
                          variant={selectedTimeframe === tf.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => { setSelectedTimeframe(tf.value); setTimeframeOpen(false); }}
                          className={selectedTimeframe === tf.value ? "bg-blue-500 hover:bg-blue-600" : ""}
                        >
                          {tf.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Кнопка отримати сигнал */}
            <Button 
              size="lg" 
              className="w-full h-14 text-lg relative overflow-visible bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
                      <Brain size={22} />
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
                    <Zap size={22} />
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
