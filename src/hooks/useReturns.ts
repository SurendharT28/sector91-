import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMonthlyReturns = () => {
  return useQuery({
    // 1. Updated query key to be consistent with useInvestorDetails but distinguishable
    // "monthly_returns" (prefix) will invalidation both ["monthly_returns"] and ["monthly_returns", investorId]
    queryKey: ["monthly_returns", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_returns")
        .select("*, investors(full_name, client_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useUpdateReturnStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 2. Validate status literals
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "paid" | "overdue" }) => {
      const updateData: any = { status };

      // 4. Set paid_at timestamp
      if (status === "paid") {
        // ideally use server timestamp
        updateData.paid_at = new Date().toISOString();
      }

      // 3. Return updated data
      const { data, error } = await supabase
        .from("monthly_returns")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // 5. Cross-hook invalidations
      // Invalidate the global list
      queryClient.invalidateQueries({ queryKey: ["monthly_returns"] });

      // Invalidate the specific investor's list if we have the ID
      if (data?.investor_id) {
        queryClient.invalidateQueries({ queryKey: ["monthly_returns", data.investor_id] });
        queryClient.invalidateQueries({ queryKey: ["investors"] });
      }

      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
  });
};
