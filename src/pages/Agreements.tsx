import { useRef, useState } from "react";
import { Upload, FileText, ExternalLink, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgreements, useUploadAgreement } from "@/hooks/useAgreements";
import { useInvestors } from "@/hooks/useInvestors";
import { useLogAction } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Agreements = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const { data: agreements, isLoading } = useAgreements();
  const { data: investors } = useInvestors();
  const upload = useUploadAgreement();
  const logAction = useLogAction();
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedInvestorId) {
      toast({ title: "Please select an investor first", variant: "destructive" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const selectedInvestor = investors?.find((i) => i.id === selectedInvestorId);
    if (!selectedInvestor) return;

    // Calculate next version
    const investorAgreements = agreements?.filter((a) => a.investor_id === selectedInvestorId) || [];
    const maxVersion = investorAgreements.length > 0 ? Math.max(...investorAgreements.map((a) => a.version)) : 0;
    const nextVersion = maxVersion + 1;

    try {
      await upload.mutateAsync({ investorId: selectedInvestorId, file, version: nextVersion });
      logAction.mutate({
        action: "Uploaded Agreement",
        referenceId: selectedInvestor.client_id || "",
        module: "Agreements",
        notes: `${file.name} (v${nextVersion})`
      });
      toast({ title: "Agreement uploaded", description: `Version ${nextVersion} added for ${selectedInvestor.full_name}` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }

    // Always reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const openFile = async (path: string) => {
    if (!path) return;
    try {
      // Use signed URL for secure access (valid for 60 seconds)
      const { data, error } = await supabase.storage.from("agreements").createSignedUrl(path, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      toast({ title: "Error opening file", description: "Could not generate secure link", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agreements</h1>
          <p className="text-sm text-muted-foreground">Upload & manage investor agreements</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedInvestorId} onValueChange={setSelectedInvestorId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Investor" />
            </SelectTrigger>
            <SelectContent>
              {investors?.map((investor) => (
                <SelectItem key={investor.id} value={investor.id}>
                  {investor.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
          <Button
            className="gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending || !selectedInvestorId}
          >
            <Upload className="h-4 w-4" />
            {upload.isPending ? "Uploading..." : "Upload Agreement"}
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !agreements?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-4 opacity-50" />
            <p>No agreements found</p>
          </div>
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
              {agreements.map((ag) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openFile(ag.file_path || "")}
                      disabled={!ag.file_path}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
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
