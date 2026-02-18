import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type TradingAccountFormValues, type PnLFormValues } from "@/schemas/tradingSchema";

export const useTradingAccounts = () => {
  return useQuery({
    queryKey: ["trading_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_accounts")
        .select("*")
        // Fixed sort order: newest first
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: TradingAccountFormValues) => {
      // Removed 'as any' cast, using stricter typing implicitly via Supabase definitions
      const { data, error } = await supabase
        .from("trading_accounts")
        .insert({
          name: account.name,
          broker: account.broker,
          capital_allocated: Number(account.capital_allocated),
          status: account.status
        })
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
    // Consolidated query key strategy: always include accountId (or "all") to avoid mismatches
    queryKey: ["daily_pnl", accountId || "all"],
    queryFn: async () => {
      let query = supabase
        .from("daily_pnl")
        .select("*")
        .order("date", { ascending: false }); // Generally want newest PnL first too
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
      // Manual cascade delete for safety, though DB might handle it
      await supabase.from("daily_pnl").delete().eq("account_id", id);

      const { error } = await supabase
        .from("trading_accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading_accounts"] });
      // Invalidate PnL too as data is removed
      queryClient.invalidateQueries({ queryKey: ["daily_pnl"] });
    },
  });
};

export const useCreatePnLEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<PnLFormValues, "date"> & { date: string }) => {
      // Removed 'as any', explicit mapping
      const { data, error } = await supabase
        .from("daily_pnl")
        .insert({
          account_id: entry.account_id,
          date: entry.date,
          pnl_amount: Number(entry.pnl_amount),
          capital_used: Number(entry.capital_used),
          notes: entry.notes,
          index_name: entry.index_name,
          setup_used: entry.setup_used,
        })
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
      // Validation: Ensure at least one field is being updated
      if (Object.keys(updates).length === 0) {
        throw new Error("No fields to update");
      }

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
