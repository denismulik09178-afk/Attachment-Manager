import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  LogOut,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  RotateCcw,
  EyeOff,
  Users,
  Bot
} from "lucide-react";

const ADMIN_TOKEN_KEY = "deni_admin_token";

interface AdminStats {
  today: { wins: number; losses: number; draws: number; total: number };
  overall: { totalSignals: number; wins: number; losses: number; winRate: string | number };
  users: { unique: number };
  todaySignalsCount: number;
  fakeWinRateEnabled?: boolean;
  realStats?: { wins: number; losses: number; winRate: string | number };
}

interface Pair {
  id: number;
  symbol: string;
  name: string;
  isEnabled: boolean;
  payout: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminUsername, setAdminUsername] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) checkSession(token);
  }, []);

  const checkSession = async (token: string) => {
    try {
      const res = await fetch("/api/admin/session", { headers: { "X-Admin-Token": token } });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setAdminUsername(data.username);
      } else {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      }
    } catch {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        setIsAuthenticated(true);
        setAdminUsername(data.username);
        setUsername("");
        setPassword("");
      } else {
        const err = await res.json();
        setLoginError(err.message || "Помилка входу");
      }
    } catch {
      setLoginError("Помилка з'єднання");
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      await fetch("/api/admin/logout", { method: "POST", headers: { "X-Admin-Token": token } });
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAuthenticated(false);
    setAdminUsername("");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-background p-4">
        <div className="w-full max-w-sm">
          <div className="glass-card-elevated rounded-2xl p-6 space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center">
                <Shield className="w-7 h-7 text-background" />
              </div>
              <div>
                <h1 className="text-lg font-bold" data-testid="text-admin-title">Адмін панель</h1>
                <p className="text-xs text-muted-foreground mt-1">Введіть логін та пароль для доступу</p>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs">Логін</Label>
                <Input
                  id="username"
                  data-testid="input-admin-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="h-11 rounded-xl bg-white/[0.03] border-white/[0.06]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs">Пароль</Label>
                <Input
                  id="password"
                  data-testid="input-admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 rounded-xl bg-white/[0.03] border-white/[0.06]"
                />
              </div>
              {loginError && (
                <p className="text-xs text-rose-400" data-testid="text-login-error">{loginError}</p>
              )}
              <Button type="submit" className="w-full h-11 rounded-xl gradient-accent font-semibold border-0" data-testid="button-admin-login">
                Увійти
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard adminUsername={adminUsername} onLogout={handleLogout} />;
}

function AdminDashboard({ adminUsername, onLogout }: { adminUsername: string; onLogout: () => void }) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  const [showSecretPanel, setShowSecretPanel] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [targetWinRate, setTargetWinRate] = useState("");

  const handleTitleClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) {
      setShowSecretPanel(true);
      setClickCount(0);
    }
  };

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { headers: { "X-Admin-Token": token } });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: pairs, isLoading: pairsLoading } = useQuery<Pair[]>({
    queryKey: ["/api/admin/pairs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/pairs", { headers: { "X-Admin-Token": token } });
      if (!res.ok) throw new Error("Failed to fetch pairs");
      return res.json();
    },
  });

  const togglePairMutation = useMutation({
    mutationFn: async (pairId: number) => {
      const res = await fetch(`/api/admin/pairs/${pairId}/toggle`, {
        method: "PATCH",
        headers: { "X-Admin-Token": token },
      });
      if (!res.ok) throw new Error("Failed to toggle pair");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/pairs"] }); },
  });

  const setFakeWinRateMutation = useMutation({
    mutationFn: async (rate: number) => {
      const res = await fetch("/api/admin/fake-winrate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({ targetWinRate: rate }),
      });
      if (!res.ok) throw new Error("Failed to set fake win rate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setTargetWinRate("");
    },
  });

  const resetWinRateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/reset-winrate", {
        method: "POST",
        headers: { "X-Admin-Token": token },
      });
      if (!res.ok) throw new Error("Failed to reset win rate");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] }); },
  });

  const handleSetFakeWinRate = () => {
    const rate = parseFloat(targetWinRate);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) setFakeWinRateMutation.mutate(rate);
  };

  const winRate = stats?.overall.totalSignals
    ? ((stats.overall.wins / (stats.overall.wins + stats.overall.losses)) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <Bot className="w-4 h-4 text-background" />
            </div>
            <div>
              <h1
                className="text-sm font-bold cursor-pointer select-none"
                data-testid="text-dashboard-title"
                onClick={handleTitleClick}
              >
                Адмін панель
              </h1>
              <p className="text-[10px] text-muted-foreground">Привіт, {adminUsername}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Вийти
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Всього сигналів"
            value={statsLoading ? "..." : String(stats?.overall.totalSignals || 0)}
            sub={`Сьогодні: ${stats?.todaySignalsCount || 0}`}
            icon={<BarChart3 className="w-4 h-4 text-primary" />}
            testId="text-total-signals"
          />
          <StatCard
            label="Точність"
            value={statsLoading ? "..." : `${winRate}%`}
            sub="Загальна точність"
            icon={<Activity className="w-4 h-4 text-primary" />}
            testId="text-winrate"
          />
          <StatCard
            label="Успішні"
            value={statsLoading ? "..." : String(stats?.overall.wins || 0)}
            sub={`Сьогодні: ${stats?.today.wins || 0}`}
            icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
            valueColor="text-emerald-400"
            testId="text-wins"
          />
          <StatCard
            label="Неуспішні"
            value={statsLoading ? "..." : String(stats?.overall.losses || 0)}
            sub={`Сьогодні: ${stats?.today.losses || 0}`}
            icon={<TrendingDown className="w-4 h-4 text-rose-400" />}
            valueColor="text-rose-400"
            testId="text-losses"
          />
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Статистика за сьогодні</p>
            <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground">
              {stats?.today.total || 0} сигналів
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">{stats?.today.wins || 0} Перемог</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-medium">{stats?.today.losses || 0} Програшів</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">{stats?.today.draws || 0} Нічиїх</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold">Користувачі</p>
          </div>
          <p className="text-2xl font-bold" data-testid="text-users">
            {statsLoading ? "..." : stats?.users.unique || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Унікальних користувачів</p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold">Керування валютними парами</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Увімкніть або вимкніть пари для генерації</p>
          </div>
          {pairsLoading ? (
            <p className="text-xs text-muted-foreground">Завантаження...</p>
          ) : (
            <div className="space-y-1.5">
              {pairs?.map((pair) => (
                <div
                  key={pair.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  data-testid={`pair-control-${pair.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">{pair.symbol}</p>
                    <p className="text-[10px] text-muted-foreground">{pair.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 h-4 ${
                        pair.isEnabled
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground'
                      }`}
                    >
                      {pair.isEnabled ? "УВІМК" : "ВИМК"}
                    </Badge>
                    <Switch
                      checked={pair.isEnabled}
                      onCheckedChange={() => togglePairMutation.mutate(pair.id)}
                      disabled={togglePairMutation.isPending}
                      data-testid={`switch-pair-${pair.id}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showSecretPanel && (
          <div className="glass-card rounded-2xl p-4 space-y-4 border-dashed border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-semibold">Точність</p>
                {stats?.fakeWinRateEnabled && (
                  <Badge variant="outline" className="text-[9px] px-1.5 h-4 bg-primary/10 border-primary/20 text-primary">
                    Активно
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSecretPanel(false)}>
                <EyeOff className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs">
              <p className="text-muted-foreground mb-1">Сьогодні:</p>
              <div className="flex gap-3">
                <span className="text-emerald-400">{stats?.today.wins || 0} Перемог</span>
                <span className="text-rose-400">{stats?.today.losses || 0} Програшів</span>
                <span className="text-amber-400">{stats?.today.draws || 0} Нічиїх</span>
                <span className="font-medium">= {stats?.today.total || 0}</span>
              </div>
            </div>

            {stats?.fakeWinRateEnabled && stats.realStats && (
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs">
                <p className="text-muted-foreground mb-1">Реальна статистика:</p>
                <div className="flex gap-3">
                  <span className="text-emerald-400">{stats.realStats.wins} Перемог</span>
                  <span className="text-rose-400">{stats.realStats.losses} Програшів</span>
                  <span className="font-medium">{stats.realStats.winRate}%</span>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="space-y-1.5 flex-1">
                <Label htmlFor="targetWinRate" className="text-[10px]">Точність %</Label>
                <Input
                  id="targetWinRate"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="70"
                  value={targetWinRate}
                  onChange={(e) => setTargetWinRate(e.target.value)}
                  className="h-9 rounded-lg bg-white/[0.03] border-white/[0.06] text-sm"
                />
              </div>
              <Button
                onClick={handleSetFakeWinRate}
                disabled={setFakeWinRateMutation.isPending || !targetWinRate}
                size="sm"
                className="h-9 rounded-lg gradient-accent border-0 text-xs font-semibold"
              >
                {setFakeWinRateMutation.isPending ? "..." : "Застосувати"}
              </Button>
              {stats?.fakeWinRateEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg border-white/10 text-xs"
                  onClick={() => resetWinRateMutation.mutate()}
                  disabled={resetWinRateMutation.isPending}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Скинути
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, valueColor, testId }: {
  label: string; value: string; sub: string; icon: React.ReactNode; valueColor?: string; testId: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
        {icon}
      </div>
      <p className={`text-xl font-bold ${valueColor || ''}`} data-testid={testId}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
