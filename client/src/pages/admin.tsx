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
  Clock
} from "lucide-react";

const ADMIN_TOKEN_KEY = "deni_admin_token";

interface AdminStats {
  today: { wins: number; losses: number; draws: number; total: number };
  overall: { totalSignals: number; wins: number; losses: number; winRate: string | number };
  users: { unique: number };
  todaySignalsCount: number;
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

  const winRate = stats?.overall.totalSignals ? 
    ((stats.overall.wins / (stats.overall.wins + stats.overall.losses)) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-dashboard-title">
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
      </div>
    </div>
  );
}
