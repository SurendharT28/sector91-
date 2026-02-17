import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAgreements = () => {
  return useQuery({
    queryKey: ["agreements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreements")
        .select("*, investors(full_name, client_id)")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useUploadAgreement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ investorId, file, version }: { investorId: string; file: File; version: number }) => {
      const filePath = `${investorId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("agreements")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("agreements").insert({
        investor_id: investorId,
        file_name: file.name,
        file_path: filePath,
        version,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agreements"] });
    },
  });
};
