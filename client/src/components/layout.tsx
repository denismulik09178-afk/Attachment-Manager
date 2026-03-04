import { Link, useLocation } from "wouter";
import { LayoutDashboard, History, Shield, Bot, Newspaper } from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Сигнали" },
  { href: "/news", icon: Newspaper, label: "Ринок" },
  { href: "/history", icon: History, label: "Історія" },
  { href: "/admin", icon: Shield, label: "Адмін" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-accent-vivid flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-3.5 h-3.5 text-background" />
            </div>
            <div>
              <h1 className="text-[13px] font-extrabold tracking-tight leading-none">DENI AI BOT</h1>
              <p className="text-[9px] text-muted-foreground leading-none mt-0.5 font-medium">Професійні торгові сигнали</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold">LIVE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-[72px]">
        <div className="max-w-lg mx-auto px-3 py-3">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-2xl border-t border-white/[0.05] bottom-safe-area">
        <div className="max-w-lg mx-auto grid grid-cols-4 h-[60px]">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`relative flex flex-col items-center justify-center gap-0.5 h-full w-full transition-all duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  {isActive && (
                    <div className="absolute top-0 w-6 h-[2px] rounded-full gradient-accent" />
                  )}
                  <item.icon className="w-[18px] h-[18px]" />
                  <span className="text-[9px] font-semibold">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
