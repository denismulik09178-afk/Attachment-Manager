
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Clock } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface SignalCardProps {
  signal: any; // Type strictly if possible
}

export function SignalCard({ signal }: SignalCardProps) {
  const isUp = signal.direction === 'UP';
  const color = isUp ? "#22c55e" : "#ef4444"; // green-500 : red-500
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Parse sparkline data
  const data = signal.sparklineData ? signal.sparklineData.map((val: number, i: number) => ({ i, val })) : [];

  // Simple timer logic
  useEffect(() => {
    if (signal.status !== 'active') return;
    
    // Calculate expiration time based on openTime + timeframe (minutes)
    const openTime = new Date(signal.openTime).getTime();
    const durationMs = signal.timeframe * 60 * 1000;
    const expiryTime = openTime + durationMs;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiryTime - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [signal]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover-elevate overflow-hidden border-l-4" style={{ borderLeftColor: color }}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">
            {signal.pair?.symbol || "Unknown Pair"}
          </CardTitle>
          <Badge variant={isUp ? "default" : "destructive"} className="gap-1">
            {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            {signal.timeframe}m
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Entry Price</p>
              <p className="text-2xl font-mono font-bold">{signal.openPrice}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                <Clock size={14} /> Expires in
              </p>
              <p className="text-xl font-mono font-bold" style={{ color }}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
          
          <div className="h-[60px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <Line 
                  type="monotone" 
                  dataKey="val" 
                  stroke={color} 
                  strokeWidth={2} 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Progress bar for timer */}
          <div className="h-1 w-full bg-muted mt-2 rounded-full overflow-hidden">
             <motion.div 
               className="h-full" 
               style={{ backgroundColor: color }}
               initial={{ width: "100%" }}
               animate={{ width: `${(timeLeft / (signal.timeframe * 60)) * 100}%` }}
               transition={{ ease: "linear", duration: 1 }}
             />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
