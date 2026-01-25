import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function usePairs() {
  return useQuery({
    queryKey: [api.pairs.list.path],
    queryFn: async () => {
      const res = await fetch(api.pairs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pairs");
      return api.pairs.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdatePair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Record<string, any>) => {
      const url = buildUrl(api.pairs.update.path, { id });
      const res = await fetch(url, {
        method: api.pairs.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update pair");
      return api.pairs.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pairs.list.path] });
    },
  });
}
