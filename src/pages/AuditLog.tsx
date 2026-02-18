import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Pass search to hook for server-side filtering
  const { data: auditData, isLoading } = useAuditLog(undefined, page, pageSize, search);

  const entries = auditData?.data || [];
  const totalCount = auditData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page on search
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">System activity & change history</p>
      </div>

      <div className="relative max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search activity..." className="pl-9" value={search} onChange={handleSearchChange} />
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !entries.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-4 opacity-50" />
            <p>No entries found</p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-border/50">
              {entries.map((entry) => (
                <div key={entry.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{entry.action}</p>
                    <Badge variant="outline" className={`text-[10px] font-medium shrink-0 ${moduleColors[entry.module || ""] || "bg-muted/15 text-muted-foreground border-muted/30"}`}>{entry.module}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{entry.notes}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[10px] text-primary">{entry.reference_id}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-foreground">{entry.action}</td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={`text-[10px] font-medium ${moduleColors[entry.module || ""] || "bg-muted/15 text-muted-foreground border-muted/30"}`}>{entry.module}</Badge>
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {totalCount > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
