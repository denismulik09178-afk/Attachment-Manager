import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { getSessionId } from "@/lib/session";

export function useSignals(params?: { status?: 'active' | 'closed', limit?: number }) {
  return useQuery({
    queryKey: [api.signals.list.path, params],
    queryFn: async () => {
      // Clean undefined params
      const cleanParams: Record<string, string | number> = {};
      if (params?.status) cleanParams.status = params.status;
      if (params?.limit) cleanParams.limit = params.limit;

      const url = buildUrl(api.signals.list.path) + "?" + new URLSearchParams(cleanParams as any).toString();
      const res = await fetch(url, { 
        credentials: "include",
        headers: { 'X-Session-Id': getSessionId() },
      });
      if (!res.ok) throw new Error("Failed to fetch signals");
      return api.signals.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5s for live updates
  });
}

export function useSignalStats() {
  return useQuery({
    queryKey: [api.signals.stats.path],
    queryFn: async () => {
      const res = await fetch(api.signals.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.signals.stats.responses[200].parse(await res.json());
    },
    refetchInterval: 30000,
  });
}
