import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Clock, DollarSign } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SignalCardProps {
  signal: any;
}

export function SignalCard({ signal }: SignalCardProps) {
  const isUp = signal.direction === 'UP';
  const color = isUp ? "#22c55e" : "#ef4444";
  const bgGradient = isUp 
    ? "from-green-500/10 to-green-500/5" 
    : "from-red-500/10 to-red-500/5";
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);

  const data = signal.sparklineData 
    ? signal.sparklineData.map((val: number, i: number) => ({ i, val })) 
    : [];

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
      
      if (remaining <= 0) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, [signal]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card 
      className={`overflow-hidden border-l-4 bg-gradient-to-br ${bgGradient}`}
      style={{ borderLeftColor: color }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
        <CardTitle className="text-lg font-bold truncate">
          {signal.pair?.symbol || "Unknown Pair"}
        </CardTitle>
        <Badge 
          className="gap-1 text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {signal.direction}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign size={12} /> Entry Price
            </p>
            <p className="text-2xl font-mono font-bold">{signal.openPrice}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Clock size={12} /> Expiry
            </p>
            <motion.p 
              className="text-2xl font-mono font-bold"
              style={{ color }}
              animate={{ scale: timeLeft <= 10 ? [1, 1.1, 1] : 1 }}
              transition={{ repeat: timeLeft <= 10 ? Infinity : 0, duration: 0.5 }}
            >
              {formatTime(timeLeft)}
            </motion.p>
          </div>
        </div>
        
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4"
            style={{ borderColor: color }}
          >
            <motion.div
              animate={{ 
                y: isUp ? [-3, 3, -3] : [3, -3, 3],
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              {isUp ? (
                <ArrowUp size={40} style={{ color }} />
              ) : (
                <ArrowDown size={40} style={{ color }} />
              )}
            </motion.div>
          </motion.div>
        </div>

        <div className="h-[50px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Line 
                type="monotone" 
                dataKey="val" 
                stroke={color} 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{signal.timeframe}m</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: "100%" }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
