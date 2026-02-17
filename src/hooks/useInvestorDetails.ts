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
    mutationFn: async (ret: { investor_id: string; month: string; amount: number; return_percent: number; status?: string }) => {
      const { data, error } = await supabase.from("monthly_returns").insert(ret).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["monthly_returns", vars.investor_id] });
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
    mutationFn: async (ret: { investor_id: string; amount: number; returned_date: string; notes?: string }) => {
      const { data, error } = await supabase.from("capital_returns").insert(ret).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["capital_returns", vars.investor_id] });
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
    mutationFn: async (entry: { investor_id: string; amount: number; initialized_date: string; notes?: string }) => {
      const { data, error } = await supabase.from("waiting_period_entries").insert(entry).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["waiting_period_entries"] });
      qc.invalidateQueries({ queryKey: ["investments", vars.investor_id] });
      qc.invalidateQueries({ queryKey: ["investors"] });
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
