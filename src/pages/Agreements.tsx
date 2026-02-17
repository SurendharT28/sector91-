import { useRef } from "react";
import { Upload, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgreements, useUploadAgreement } from "@/hooks/useAgreements";
import { useInvestors } from "@/hooks/useInvestors";
import { useLogAction } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Agreements = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: agreements, isLoading } = useAgreements();
  const { data: investors } = useInvestors();
  const upload = useUploadAgreement();
  const logAction = useLogAction();
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !investors?.length) return;
    // Default to first investor for now — a picker could be added
    const investorId = investors[0].id;
    try {
      await upload.mutateAsync({ investorId, file, version: 1 });
      logAction.mutate({ action: "Uploaded Agreement", referenceId: investors[0].client_id || "", module: "Agreements", notes: file.name });
      toast({ title: "Agreement uploaded" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const openFile = (path: string) => {
    const { data } = supabase.storage.from("agreements").getPublicUrl(path);
    window.open(data.publicUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agreements</h1>
          <p className="text-sm text-muted-foreground">Upload & manage investor agreements</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          <Button className="gap-2" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            <Upload className="h-4 w-4" />{upload.isPending ? "Uploading..." : "Upload Agreement"}
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Investor</th>
                <th className="px-5 py-3">File</th>
                <th className="px-5 py-3">Version</th>
                <th className="px-5 py-3">Uploaded</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(agreements || []).map((ag) => (
                <tr key={ag.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-foreground">{ag.investors?.full_name}</p>
                    <p className="font-mono text-xs text-primary">{ag.investors?.client_id}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{ag.file_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Badge variant="outline" className="font-mono text-[10px]">v{ag.version}</Badge></td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {new Date(ag.uploaded_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-4">
                    <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => openFile(ag.file_path || "")}>
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Agreements;
