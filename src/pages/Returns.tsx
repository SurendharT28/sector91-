import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyReturns } from "@/hooks/useReturns";

const formatCurrency = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtMonth = (m: string) => {
  const [year, month] = m.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const Returns = () => {
  const { data: returns, isLoading } = useMonthlyReturns();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Monthly Returns</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Track investor payouts & return history</p>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="table-responsive">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 sm:px-5 py-3">Investor</th>
                  <th className="px-4 sm:px-5 py-3">Month</th>
                  <th className="px-4 sm:px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(returns || []).map((ret) => (
                  <tr key={ret.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-4 sm:px-5 py-4">
                      <p className="text-sm font-medium text-foreground">{ret.investors?.full_name}</p>
                      <p className="font-mono text-xs text-primary">{ret.investors?.client_id}</p>
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">{fmtMonth(ret.month)}</td>
                    <td className="px-4 sm:px-5 py-4 font-mono text-sm font-medium text-foreground whitespace-nowrap">{formatCurrency(Number(ret.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Returns;
