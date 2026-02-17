import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAuditLog = (limit?: number) => {
  return useQuery({
    queryKey: ["audit_logs", limit],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
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
