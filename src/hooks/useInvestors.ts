import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useInvestors = () => {
  return useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateInvestor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (investor: {
      full_name: string;
      email?: string;
      phone?: string;
      address?: string;
      investment_amount?: number;
      promised_return?: number;
      joining_date?: string;
    }) => {
      const { data, error } = await supabase
        .from("investors")
        .insert(investor)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
  });
};

export const useUpdateInvestorStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === "waiting_period") {
        updateData.waiting_period_start = new Date().toISOString();
      } else {
        updateData.waiting_period_start = null;
      }
      const { data, error } = await supabase
        .from("investors")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
  });
};

export const useUpdateInvestor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; full_name?: string; email?: string; phone?: string; address?: string }) => {
      const { data, error } = await supabase
        .from("investors")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
  });
};

export const useDeleteInvestor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete related records first
      await supabase.from("monthly_returns").delete().eq("investor_id", id);
      await supabase.from("investments").delete().eq("investor_id", id);
      await supabase.from("capital_returns").delete().eq("investor_id", id);
      await supabase.from("waiting_period_entries").delete().eq("investor_id", id);
      await supabase.from("agreements").delete().eq("investor_id", id);
      const { error } = await supabase.from("investors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
    },
  });
};
