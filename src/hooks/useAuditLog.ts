import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAuditLog = (limit?: number, page: number = 1, pageSize: number = 20, search?: string) => {
  return useQuery({
    // 1. Optimize query keys: split limit vs pagination caching, include search key
    queryKey: limit
      ? ["audit_logs", "limit", limit]
      : ["audit_logs", "page", page, pageSize, search],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("timestamp", { ascending: false });

      // Add server-side search filter
      if (search) {
        query = query.or(`action.ilike.%${search}%,module.ilike.%${search}%,notes.ilike.%${search}%,reference_id.ilike.%${search}%`);
      }

      if (limit) {
        query = query.limit(limit);
      } else {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count };
    },
    // Keep data fresh but don't refetch aggressively
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useLogAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 4. Make referenceId optional
    mutationFn: async (entry: { action: string; referenceId?: string; module: string; notes: string }) => {
      const { error } = await supabase.from("audit_logs").insert({
        action: entry.action,
        reference_id: entry.referenceId || null, // Handle optional ref ID
        module: entry.module,
        notes: entry.notes,
        // 3. Explicitly set timestamp
        timestamp: new Date().toISOString(),
      });
      if (error) throw error;
    },
    // 2. Targeted invalidation
    onSuccess: () => {
      // Invalidate both limited widgets and full paginated lists
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
    },
    // 5. Add error handling
    onError: (error) => {
      console.error("Failed to log action:", error);
      // We explicitly DO NOT toast here to avoid cluttering UI with background logging errors
    }
  });
};
