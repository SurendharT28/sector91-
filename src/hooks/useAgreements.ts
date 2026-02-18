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
      // 1. Validate version
      if (!Number.isInteger(version) || version < 1) {
        throw new Error("Version must be a positive integer");
      }

      // 2. Validate file type (PDF only)
      if (file.type !== "application/pdf") {
        throw new Error("Only PDF files are allowed");
      }

      // 3. Validate file size (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_SIZE) {
        throw new Error("File size exceeds 5MB limit");
      }

      // 4. Sanitize filename
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${investorId}/${Date.now()}_${safeName}`;

      // 5. Check for duplicate version
      const { data: existing } = await supabase
        .from("agreements")
        .select("id")
        .eq("investor_id", investorId)
        .eq("version", version)
        .maybeSingle();

      if (existing) {
        throw new Error(`Version ${version} already exists for this investor`);
      }

      // 6. Upload file
      const { error: uploadError } = await supabase.storage
        .from("agreements")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // 7. Insert into DB with cleanup on failure
      const { error: dbError } = await supabase.from("agreements").insert({
        investor_id: investorId,
        file_name: safeName,
        file_path: filePath,
        version,
      });

      if (dbError) {
        // Cleanup: Delete uploaded file if DB insert fails
        await supabase.storage.from("agreements").remove([filePath]);
        throw dbError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agreements"] });
    },
  });
};
