import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fetchExpenses = async () => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data;
};

export const useExpenses = () => {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
  });
};

export const useTotalExpenses = () => {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
    select: (data) => (data || []).reduce((sum, e) => sum + Number(e.amount), 0),
  });
};

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: { amount: number; date: string; notes?: string }) => {
      // Validation
      if (expense.amount <= 0 || !Number.isFinite(expense.amount)) {
        throw new Error("Amount must be a positive number");
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expense.date)) {
        throw new Error("Date must be in YYYY-MM-DD format");
      }

      const { data, error } = await supabase.from("expenses").insert(expense).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (newExpense) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });
      const previous = qc.getQueryData(["expenses"]);
      qc.setQueryData(["expenses"], (old: any[] = []) => [
        { ...newExpense, id: 'temp-' + Date.now(), created_at: new Date().toISOString() },
        ...old
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      return { previous };
    },
    onError: (err, newExpense, context) => {
      qc.setQueryData(["expenses"], context?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });
      const previous = qc.getQueryData(["expenses"]);
      qc.setQueryData(["expenses"], (old: any[] = []) => old.filter((e) => e.id !== id));
      return { previous };
    },
    onError: (err, id, context) => {
      qc.setQueryData(["expenses"], context?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; amount?: number; date?: string; notes?: string }) => {
      // Validation only if fields are present
      if (updates.amount !== undefined && (updates.amount <= 0 || !Number.isFinite(updates.amount))) {
        throw new Error("Amount must be a positive number");
      }
      if (updates.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(updates.date)) {
        throw new Error("Date must be in YYYY-MM-DD format");
      }

      const { data, error } = await supabase.from("expenses").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (updatedExpense) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });
      const previous = qc.getQueryData(["expenses"]);
      qc.setQueryData(["expenses"], (old: any[] = []) => old.map((e) => e.id === updatedExpense.id ? { ...e, ...updatedExpense } : e));
      return { previous };
    },
    onError: (err, newExpense, context) => {
      qc.setQueryData(["expenses"], context?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
};
