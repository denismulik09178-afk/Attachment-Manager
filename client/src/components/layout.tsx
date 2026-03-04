import { Link, useLocation } from "wouter";
import { LayoutDashboard, History, Shield, Bot } from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Сигнали" },
  { href: "/history", icon: History, label: "Історія" },
  { href: "/admin", icon: Shield, label: "Адмін" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-background" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight leading-none">DENI AI BOT</h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Торгові сигнали</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">Онлайн</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto px-4 py-4">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-white/[0.06] bottom-safe-area">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute -top-0 w-8 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
