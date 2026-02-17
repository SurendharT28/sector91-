import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAuditLog = (limit?: number, page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: ["audit_logs", limit, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("timestamp", { ascending: false });

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
  });
};

export const useLogAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { action: string; referenceId: string; module: string; notes: string }) => {
      const { error } = await supabase.from("audit_logs").insert({
        action: entry.action,
        reference_id: entry.referenceId,
        module: entry.module,
        notes: entry.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit_logs"] });
    },
  });
};
