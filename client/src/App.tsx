
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import { useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import HistoryPage from "@/pages/history";
import NewsPage from "@/pages/news";
import AdminPage from "@/pages/admin";
import PocketLogin from "@/pages/pocket-login";
import { Layout } from "@/components/layout";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Layout><Dashboard /></Layout>
      </Route>
      <Route path="/news">
        <Layout><NewsPage /></Layout>
      </Route>
      <Route path="/history">
        <Layout><HistoryPage /></Layout>
      </Route>
      <Route path="/admin">
        <AdminPage />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [pocketId, setPocketId] = useState<string | null>(() => {
    return localStorage.getItem('pocket_option_id');
  });
  const [location] = useLocation();

  const handleLogin = (id: string) => {
    setPocketId(id);
  };

  if (!pocketId && location !== '/admin') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <PocketLogin onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
