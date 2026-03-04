import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, KeyRound, ArrowRight, ShieldCheck, BarChart3, Zap, TrendingUp, AlertCircle } from "lucide-react";

interface PocketLoginProps {
  onLogin: (pocketId: string) => void;
}

export default function PocketLogin({ onLogin }: PocketLoginProps) {
  const [pocketId, setPocketId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = pocketId.trim();
    if (!/^\d{9}$/.test(trimmed)) {
      setError("ID має бути рівно 9 цифр");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch('/api/pocket-user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pocketId: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Помилка реєстрації");
        setIsLoading(false);
        return;
      }

      localStorage.setItem('pocket_option_id', trimmed);
      onLogin(trimmed);
    } catch (e) {
      setError("Помилка з'єднання з сервером");
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Zap, text: "ШІ-сигнали в реальному часі", color: "text-primary" },
    { icon: BarChart3, text: "7+ технічних індикаторів", color: "text-blue-400" },
    { icon: TrendingUp, text: "Точність від 67%+", color: "text-emerald-400" },
    { icon: ShieldCheck, text: "Безпечний та анонімний", color: "text-amber-400" },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(160 84% 39% / 0.08), transparent), linear-gradient(180deg, hsl(225 25% 6%) 0%, hsl(225 28% 4%) 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl gradient-accent-vivid flex items-center justify-center mx-auto shadow-2xl shadow-primary/30"
          >
            <Bot className="w-8 h-8 text-background" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" data-testid="text-title">DENI AI BOT</h1>
            <p className="text-xs text-muted-foreground mt-1">Професійні торгові сигнали для Pocket Option</p>
          </div>
        </div>

        <div className="glass-card-elevated p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold">Введіть ваш Pocket Option ID</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Знайдіть ваш ID в профілі Pocket Option (9 цифр)
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                placeholder="123456789"
                value={pocketId}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                  setPocketId(val);
                  if (error) setError("");
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center text-lg font-mono font-bold tracking-[0.3em] placeholder:text-muted-foreground/30 placeholder:tracking-[0.3em] focus:outline-none focus:border-primary/40 transition-colors"
                data-testid="input-pocket-id"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className={`text-[10px] font-mono font-semibold ${pocketId.length === 9 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                  {pocketId.length}/9
                </span>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20"
              >
                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <p className="text-[10px] text-rose-400">{error}</p>
              </motion.div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={pocketId.length !== 9 || isLoading}
            className={`w-full h-12 rounded-xl text-sm font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${
              pocketId.length === 9 && !isLoading
                ? 'gradient-accent-vivid text-background shadow-lg shadow-primary/25'
                : 'bg-white/[0.04] text-muted-foreground cursor-not-allowed'
            }`}
            data-testid="button-login"
          >
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Bot className="w-4 h-4" />
              </motion.div>
            ) : (
              <>
                Увійти
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card p-2.5 flex items-center gap-2"
            >
              <f.icon className={`w-3.5 h-3.5 ${f.color} shrink-0`} />
              <p className="text-[9px] text-muted-foreground font-medium">{f.text}</p>
            </motion.div>
          ))}
        </div>

        <p className="text-[9px] text-center text-muted-foreground/40">
          v2.0 | DENI AI BOT | Powered by GPT-4
        </p>
      </motion.div>
    </div>
  );
}
