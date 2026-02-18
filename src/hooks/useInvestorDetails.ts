import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useInvestments = (investorId: string) => {
  return useQuery({
    queryKey: ["investments", investorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("investor_id", investorId)
        .order("invested_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!investorId,
  });
};

export const useAddInvestment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inv: { investor_id: string; amount: number; invested_date: string; notes?: string; promised_return?: number }) => {
      const { data, error } = await supabase.from("investments").insert(inv).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["investments", vars.investor_id] });
      qc.invalidateQueries({ queryKey: ["investors"] });
    },
  });
};

export const useMonthlyReturns = (investorId: string) => {
  return useQuery({
    queryKey: ["monthly_returns", investorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_returns")
        .select("*")
        .eq("investor_id", investorId)
        .order("month", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!investorId,
  });
};

export const useAddMonthlyReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      investor_id, month, amount, return_percent
    }: { investor_id: string; month: string; amount: number; return_percent: number }) => {
      // 1. Validate inputs
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new Error("Month must be in YYYY-MM format");
      }
      if (return_percent < -100 || return_percent > 1000) {
        throw new Error("Return percent must be between -100 and 1000");
      }
      if (!Number.isFinite(amount)) {
        throw new Error("Amount must be a valid number");
      }

      // 2. Check for duplicate return (same month + investor)
      const { data: existing } = await supabase
        .from("monthly_returns")
        .select("id")
        .eq("investor_id", investor_id)
        .eq("month", month)
        .maybeSingle();

      if (existing) {
        throw new Error(`Return for ${month} already exists for this investor`);
      }

      const { data, error } = await supabase.from("monthly_returns").insert({
        investor_id,
        month,
        amount,
        status: "pending", // Default status
        // return_percent isn't in DB schema yet based on previous files, assumed calculated or stored differently? 
        // Re-checking schema: monthly_returns table has: id, investor_id, month, amount, status, created_at.
        // There is no return_percent column in the schema shown earlier! 
        // The user mentioned return_percent validation, implying it might be used in logic or planned.
        // Based on schema, we only insert amount. If return_percent is needed, schema update is required.
        // For now, I will assume it is used for calculation or validation but not stored directly if column missing.
        // However, looking at the code I'm replacing, it was just passed through.
        // I will stick to inserting what the DB supports: investor_id, month, amount.
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["monthly_returns", vars.investor_id] });
      // 3. Invalidate global list to keep main returns page in sync
      qc.invalidateQueries({ queryKey: ["monthly_returns"] });
      // 4. Invalidate investors list as total returns change
      qc.invalidateQueries({ queryKey: ["investors"] });
      qc.invalidateQueries({ queryKey: ["dashboard_stats"], exact: true });
    },
  });
};

export const useCapitalReturns = (investorId: string) => {
  return useQuery({
    queryKey: ["capital_returns", investorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_returns")
        .select("*")
        .eq("investor_id", investorId)
        .order("returned_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!investorId,
  });
};

export const useAddCapitalReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      investor_id, amount, date
    }: { investor_id: string; amount: number; date: string }) => {
      if (amount <= 0) throw new Error("Amount must be positive");

      const { data, error } = await supabase.from("capital_returns").insert({
        investor_id,
        amount,
        date,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["capital_returns", vars.investor_id] });
      // 4. Invalidate investments as net capital changes
      qc.invalidateQueries({ queryKey: ["investments", vars.investor_id] });
      qc.invalidateQueries({ queryKey: ["investors"] });
    },
  });
};

export const useWaitingPeriodEntries = (investorId?: string) => {
  return useQuery({
    queryKey: ["waiting_period_entries", investorId || "all"],
    queryFn: async () => {
      let query = supabase.from("waiting_period_entries").select("*").order("initialized_date", { ascending: false });
      if (investorId) query = query.eq("investor_id", investorId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useAddWaitingPeriodEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: any) => {
      const { data, error } = await supabase.from("waiting_period_entries").insert(entry).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      // 5. Explicitly document prefix invalidation
      // Invalidates both ["waiting_period_entries", "all"] and ["waiting_period_entries", investorId]
      qc.invalidateQueries({ queryKey: ["waiting_period_entries"] });
    },
  });
};

/**
 * Mark a waiting period entry as delivered (manual override).
 * Sets delivered=true and delivered_at=now(), bypassing the 60-day wait.
 */
export const useMarkDelivered = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data, error } = await supabase
        .from("waiting_period_entries")
        .update({ delivered: true, delivered_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all related queries for reactive UI updates
      qc.invalidateQueries({ queryKey: ["waiting_period_entries"] });
      qc.invalidateQueries({ queryKey: ["investors"] });
    },
  });
};
