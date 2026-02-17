import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTradingAccounts = () => {
  return useQuery({
    queryKey: ["trading_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: { name: string; broker?: string; capital_allocated?: number }) => {
      const { data, error } = await supabase
        .from("trading_accounts")
        .insert(account)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading_accounts"] });
    },
  });
};

export const useDailyPnL = (accountId?: string) => {
  return useQuery({
    queryKey: ["daily_pnl", accountId],
    queryFn: async () => {
      let query = supabase
        .from("daily_pnl")
        .select("*")
        .order("date", { ascending: true });
      if (accountId) query = query.eq("account_id", accountId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; broker?: string; capital_allocated?: number; status?: string }) => {
      const { data, error } = await supabase
        .from("trading_accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading_accounts"] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trading_accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading_accounts"] });
    },
  });
};

export const useCreatePnLEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      account_id: string;
      date: string;
      index_name: string;
      pnl_amount: number;
      capital_used: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("daily_pnl")
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_pnl"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
  });
};

export const useDeletePnLEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("daily_pnl")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_pnl"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
  });
};

export const useEditPnLEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; account_id?: string; date?: string; index_name?: string; pnl_amount?: number; capital_used?: number; notes?: string }) => {
      const { data, error } = await supabase
        .from("daily_pnl")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_pnl"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
  });
};
