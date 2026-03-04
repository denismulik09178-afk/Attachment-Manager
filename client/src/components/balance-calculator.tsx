import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, DollarSign, Percent, ChevronDown, ShieldCheck } from "lucide-react";

export function BalanceCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [balance, setBalance] = useState("");
  const [riskPercent, setRiskPercent] = useState("2");

  const balanceNum = parseFloat(balance) || 0;
  const riskNum = parseFloat(riskPercent) || 2;
  const tradeAmount = (balanceNum * riskNum) / 100;

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 transition-all active:scale-[0.99]"
        data-testid="toggle-calculator"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-bold">Калькулятор ризику</p>
            <p className="text-[9px] text-muted-foreground">Визначте суму для входу</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                    <DollarSign className="w-2.5 h-2.5" /> Баланс ($)
                  </label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs font-mono focus:outline-none focus:border-primary/30"
                    data-testid="input-balance"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                    <Percent className="w-2.5 h-2.5" /> Ризик (%)
                  </label>
                  <div className="flex gap-1">
                    {['1', '2', '3', '5'].map(p => (
                      <button
                        key={p}
                        onClick={() => setRiskPercent(p)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                          riskPercent === p
                            ? 'gradient-accent text-background'
                            : 'bg-white/[0.04] text-muted-foreground border border-white/[0.06]'
                        }`}
                        data-testid={`risk-${p}`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {balanceNum > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-primary/5 border border-primary/15"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-[9px] text-muted-foreground">Рекомендована сума входу</p>
                        <p className="text-lg font-black text-primary" data-testid="text-trade-amount">${tradeAmount.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground">{riskNum}% від ${balanceNum.toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground/60">Макс. втрата за угоду</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex items-start gap-1.5 px-1">
                <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[8px] text-muted-foreground/70">
                  Професійні трейдери ризикують 1-2% від депозиту на кожну угоду. Це захищає ваш капітал від великих втрат.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
