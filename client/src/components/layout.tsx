import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, History, TrendingUp } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar>
          <SidebarContent>
            <div className="p-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <h1 className="text-xl font-bold tracking-tight">Forex Signals</h1>
            </div>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/"}>
                      <Link href="/">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/history"}>
                      <Link href="/history">
                        <History />
                        <span>History</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4 border-t text-xs text-muted-foreground">
              <p>Signals are not financial advice. Trade at your own risk.</p>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-y-auto">
          <header className="h-14 border-b flex items-center px-4 gap-4 sticky top-0 bg-background/80 backdrop-blur z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="ml-auto flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Pocket Option OTC</span>
            </div>
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
