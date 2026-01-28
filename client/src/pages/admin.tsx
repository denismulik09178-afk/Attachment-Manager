import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Users, 
  BarChart3, 
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  RotateCcw,
  Eye,
  EyeOff
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
    if (token) {
      checkSession(token);
    }
  }, []);

  const checkSession = async (token: string) => {
    try {
      const res = await fetch("/api/admin/session", {
        headers: { "X-Admin-Token": token },
      });
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
        setLoginError(err.message || "Login failed");
      }
    } catch {
      setLoginError("Connection error");
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "X-Admin-Token": token },
      });
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAuthenticated(false);
    setAdminUsername("");
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle data-testid="text-admin-title">DENI AI BOT - Admin</CardTitle>
            <CardDescription>Введіть логін та пароль для доступу</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Логін</Label>
                <Input
                  id="username"
                  data-testid="input-admin-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  data-testid="input-admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive" data-testid="text-login-error">{loginError}</p>
              )}
              <Button type="submit" className="w-full" data-testid="button-admin-login">
                Увійти
              </Button>
            </form>
          </CardContent>
        </Card>
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
      const res = await fetch("/api/admin/stats", {
        headers: { "X-Admin-Token": token },
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: pairs, isLoading: pairsLoading } = useQuery<Pair[]>({
    queryKey: ["/api/admin/pairs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/pairs", {
        headers: { "X-Admin-Token": token },
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pairs"] });
    },
  });

  const setFakeWinRateMutation = useMutation({
    mutationFn: async (rate: number) => {
      const res = await fetch("/api/admin/fake-winrate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Token": token 
        },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const handleSetFakeWinRate = () => {
    const rate = parseFloat(targetWinRate);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
      setFakeWinRateMutation.mutate(rate);
    }
  };

  const winRate = stats?.overall.totalSignals ? 
    ((stats.overall.wins / (stats.overall.wins + stats.overall.losses)) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 
              className="text-2xl font-bold flex items-center gap-2 cursor-pointer select-none" 
              data-testid="text-dashboard-title"
              onClick={handleTitleClick}
            >
              <Shield className="w-6 h-6 text-primary" />
              Адмін Панель
            </h1>
            <p className="text-muted-foreground">Привіт, {adminUsername}</p>
          </div>
          <Button variant="outline" onClick={onLogout} data-testid="button-admin-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Вийти
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Всього сигналів</CardTitle>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-signals">
                {statsLoading ? "..." : stats?.overall.totalSignals || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Сьогодні: {stats?.todaySignalsCount || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Успішні (WIN)</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500" data-testid="text-wins">
                {statsLoading ? "..." : stats?.overall.wins || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Сьогодні: {stats?.today.wins || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Неуспішні (LOSE)</CardTitle>
              <TrendingDown className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500" data-testid="text-losses">
                {statsLoading ? "..." : stats?.overall.losses || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Сьогодні: {stats?.today.losses || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Activity className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="text-winrate">
                {statsLoading ? "..." : `${winRate}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Загальна точність
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Користувачі</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-users">
                {statsLoading ? "..." : stats?.users.unique || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Унікальних користувачів
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Статистика за сьогодні</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">{stats?.today.wins || 0} WIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium">{stats?.today.losses || 0} LOSE</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium">{stats?.today.draws || 0} DRAW</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-muted-foreground">Всього:</span>
                  <span className="font-bold">{stats?.today.total || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Керування валютними парами</CardTitle>
            <CardDescription>
              Увімкніть або вимкніть валютні пари для генерації сигналів
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pairsLoading ? (
              <p className="text-muted-foreground">Завантаження...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pairs?.map((pair) => (
                  <div
                    key={pair.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`pair-control-${pair.id}`}
                  >
                    <div>
                      <p className="font-medium">{pair.symbol}</p>
                      <p className="text-xs text-muted-foreground">{pair.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pair.isEnabled ? "default" : "secondary"}>
                        {pair.isEnabled ? "ON" : "OFF"}
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
          </CardContent>
        </Card>

        {showSecretPanel && (
          <Card className="border-dashed border-2 border-muted-foreground/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <CardTitle className="text-base">Win Rate</CardTitle>
                  {stats?.fakeWinRateEnabled && (
                    <Badge variant="outline" className="text-xs">Активно</Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowSecretPanel(false)}
                >
                  <EyeOff className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats?.fakeWinRateEnabled && stats.realStats && (
                <div className="p-3 rounded-md bg-muted/50 text-sm">
                  <p className="text-muted-foreground mb-1">Реальна статистика:</p>
                  <div className="flex gap-4">
                    <span className="text-green-500">{stats.realStats.wins} WIN</span>
                    <span className="text-red-500">{stats.realStats.losses} LOSE</span>
                    <span className="font-medium">{stats.realStats.winRate}%</span>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="targetWinRate">Win Rate %</Label>
                  <Input
                    id="targetWinRate"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="70"
                    value={targetWinRate}
                    onChange={(e) => setTargetWinRate(e.target.value)}
                    className="w-24"
                  />
                </div>
                <Button
                  onClick={handleSetFakeWinRate}
                  disabled={setFakeWinRateMutation.isPending || !targetWinRate}
                  size="default"
                >
                  {setFakeWinRateMutation.isPending ? "..." : "Застосувати"}
                </Button>
                {stats?.fakeWinRateEnabled && (
                  <Button
                    variant="outline"
                    onClick={() => resetWinRateMutation.mutate()}
                    disabled={resetWinRateMutation.isPending}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Скинути
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
