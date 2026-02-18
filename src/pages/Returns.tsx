import { useState } from "react";
import { Search, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMonthlyReturns } from "@/hooks/useReturns";

const formatCurrency = (n: number) => "₹" + n.toLocaleString("en-IN");
const formatPercent = (n: number) => n + "%";

const fmtMonth = (m: string) => {
  if (!m || !m.includes("-")) return m || "—";
  const [year, month] = m.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  if (isNaN(d.getTime())) return m;
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  paid: { label: "Paid", className: "bg-profit/15 text-profit border-profit/30", icon: <CheckCircle className="h-3 w-3" /> },
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30", icon: <Clock className="h-3 w-3" /> },
  overdue: { label: "Overdue", className: "bg-loss/15 text-loss border-loss/30", icon: <AlertCircle className="h-3 w-3" /> },
};

const Returns = () => {
  const { data: returns, isLoading } = useMonthlyReturns();
  const [search, setSearch] = useState("");

  const filtered = (returns || []).filter((ret) => {
    const term = search.toLowerCase();
    const invName = (ret.investors?.full_name || "").toLowerCase();
    const invId = (ret.investors?.client_id || "").toLowerCase();
    const status = (ret.status || "").toLowerCase();
    const monthStr = fmtMonth(ret.month).toLowerCase();

    return invName.includes(term) || invId.includes(term) || status.includes(term) || monthStr.includes(term);
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Monthly Returns</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track investor payouts & return history</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search returns..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            {returns && returns.length === 0 ? "No returns recorded yet" : "No matching returns found"}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 sm:px-5 py-3 ml-2">Investor</th>
                  <th className="px-4 sm:px-5 py-3">Month</th>
                  <th className="px-4 sm:px-5 py-3">Rate</th>
                  <th className="px-4 sm:px-5 py-3">Amount</th>
                  <th className="px-4 sm:px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ret) => {
                  const status = ret.status || "pending";
                  const cfg = statusConfig[status] || statusConfig.pending;
                  return (
                    <tr key={ret.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                      <td className="px-4 sm:px-5 py-4">
                        <p className="text-sm font-medium text-foreground">{ret.investors?.full_name || "Unknown Investor"}</p>
                        <p className="font-mono text-xs text-primary">{ret.investors?.client_id || "—"}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">{fmtMonth(ret.month)}</td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {ret.return_percent ? formatPercent(ret.return_percent) : "—"}
                      </td>
                      <td className="px-4 sm:px-5 py-4 font-mono text-sm font-medium text-foreground whitespace-nowrap">{formatCurrency(Number(ret.amount))}</td>
                      <td className="px-4 sm:px-5 py-4">
                        <Badge variant="outline" className={`gap-1 text-[10px] font-medium uppercase ${cfg.className}`}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Returns;
