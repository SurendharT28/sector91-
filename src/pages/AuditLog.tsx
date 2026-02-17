import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLog } from "@/hooks/useAuditLog";

const moduleColors: Record<string, string> = {
  Investors: "bg-primary/15 text-primary border-primary/30",
  Trading: "bg-warning/15 text-warning border-warning/30",
  Agreements: "bg-[hsl(200,80%,55%)]/15 text-[hsl(200,80%,55%)] border-[hsl(200,80%,55%)]/30",
  Returns: "bg-profit/15 text-profit border-profit/30",
};

const AuditLog = () => {
  const [search, setSearch] = useState("");
  const { data: entries, isLoading } = useAuditLog();

  const filtered = (entries || []).filter(
    (e) =>
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      (e.notes || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">System activity & change history</p>
      </div>

      <div className="relative max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search activity..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-border/50">
              {filtered.map((entry) => (
                <div key={entry.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{entry.action}</p>
                    <Badge variant="outline" className={`text-[10px] font-medium shrink-0 ${moduleColors[entry.module || ""] || ""}`}>{entry.module}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{entry.notes}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] text-primary">{entry.reference_id}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block table-responsive">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Module</th>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-foreground">{entry.action}</td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={`text-[10px] font-medium ${moduleColors[entry.module || ""] || ""}`}>{entry.module}</Badge>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-primary">{entry.reference_id}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{entry.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
