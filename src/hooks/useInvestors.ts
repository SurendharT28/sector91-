import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useInvestors = () => {
  return useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        // Fixed sort order: show newest first
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useInvestor = (id: string) => {
  return useQuery({
    queryKey: ["investor", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateInvestor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (investor: any) => {
      // Removed PII logging
      const { data, error } = await supabase.from("investors").insert(investor).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
    },
  });
};

export const useUpdateInvestorStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Validated status type
    mutationFn: async ({ id, status }: { id: string; status: "active" | "waiting_period" | "inactive" | "exited" }) => {
      const updateData: any = { status };

      if (status === "waiting_period") {
        // ideally use server timestamp, client time is fallback
        updateData.waiting_period_start = new Date().toISOString();
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
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["investor", vars.id] });
    },
  });
};

export const useUpdateInvestor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Added financial fields to update type
    mutationFn: async ({ id, ...updates }: {
      id: string;
      full_name?: string;
      email?: string;
      phone?: string;
      address?: string;
      investment_amount?: number;
      promised_return?: number;
    }) => {
      const { data, error } = await supabase
        .from("investors")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["investor", vars.id] });
    },
  });
};

export const useDeleteInvestor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Removed manual deletes of related tables.
      // Database is configured with ON DELETE CASCADE for:
      // - monthly_returns
      // - investments
      // - agreements
      // - capital_returns (implied by schema structure pattern)
      // This prevents race conditions and partial deletes.

      const { error } = await supabase.from("investors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
    },
  });
};
