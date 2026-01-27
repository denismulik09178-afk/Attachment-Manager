
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import HistoryPage from "@/pages/history";
import AdminPage from "@/pages/admin";
import { Layout } from "@/components/layout";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Layout><Dashboard /></Layout>
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
