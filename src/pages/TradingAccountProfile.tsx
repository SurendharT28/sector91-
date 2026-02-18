import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, CheckCircle, PauseCircle, XCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTradingAccounts, useDailyPnL } from "@/hooks/useTrading";
import { downloadWeeklyPnLReport, downloadMonthlyPnLReport } from "@/lib/reportUtils";

const formatCurrency = (n: number) => "₹" + n.toLocaleString("en-IN");

const statusConfig: Record<string, { className: string; icon: React.ReactNode }> = {
  active: { className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: <CheckCircle className="h-3 w-3" /> },
  paused: { className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", icon: <PauseCircle className="h-3 w-3" /> },
  closed: { className: "bg-destructive/15 text-destructive border-destructive/30", icon: <XCircle className="h-3 w-3" /> },
};

const TradingAccountProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: accounts, isLoading: accLoading } = useTradingAccounts();
  const { data: pnlData, isLoading: pnlLoading } = useDailyPnL(id);

  const account = accounts?.find((a) => a.id === id);

  // Helper to safely parse YYYY-MM-DD to local Date (timezone safe)
  const parseDateLocal = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // Robust sort: oldest to newest for charts
  const pnl = (pnlData || []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalPnL = pnl.reduce((s, e) => s + Number(e.pnl_amount), 0);
  const wins = pnl.filter((e) => Number(e.pnl_amount) > 0).length;
  const winRate = pnl.length > 0 ? ((wins / pnl.length) * 100).toFixed(1) : "0";

  // Calculate equity curve
  // Note: Baseline starts from current allocated capital. Historical changes in capital are not tracked,
  // so the curve represents "If current capital was initial capital + PnL history".
  let equity = Number(account?.capital_allocated || 0);
  const equityCurve = pnl.map((e) => {
    equity += Number(e.pnl_amount);
    const d = parseDateLocal(String(e.date));
    return {
      date: format(d, "dd MMM"),
      fullDate: format(d, "dd MMM yyyy"),
      equity,
      pnl: Number(e.pnl_amount)
    };
  });

  const dailyBars = pnl.map((e) => {
    const d = parseDateLocal(String(e.date));
    return {
      date: format(d, "MM-dd"),
      fullDate: format(d, "dd MMM yyyy"),
      pnl: Number(e.pnl_amount),
      fill: Number(e.pnl_amount) >= 0 ? "#10b981" : "#ef4444", // emerald-500, red-500
    };
  });

  if (accLoading || pnlLoading) {
    return (
      <div className="space-y-6 container mx-auto p-6 max-w-7xl">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4 container mx-auto p-6 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate("/trading")} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
        <p className="text-muted-foreground">Account not found.</p>
      </div>
    );
  }

  const status = account.status || "active";
  const statusCfg = statusConfig[status] || statusConfig.active;
  // Calculate current equity including allocated capital + total PnL
  const currentEquity = Number(account.capital_allocated) + totalPnL;

  return (
    <div className="space-y-6 container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full" onClick={() => navigate("/trading")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight uppercase">{account.name}</h1>
              <Badge variant="outline" className={`gap-1 text-[10px] font-medium uppercase tracking-wide ${statusCfg.className}`}>
                {statusCfg.icon} {status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Broker: {account.broker || "N/A"} • Capital: {formatCurrency(Number(account.capital_allocated))}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto ml-14 sm:ml-0 bg-background hover:bg-muted/50">
              <Download className="h-4 w-4" /> Reports
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => downloadWeeklyPnLReport(pnl, accounts || [], id)}>Weekly P&L Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadMonthlyPnLReport(pnl, accounts || [], id)}>Monthly P&L Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-card p-6 flex flex-col items-center justify-center bg-card rounded-xl border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Net P&L</p>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {formatCurrency(totalPnL)}
          </p>
        </div>
        <div className="glass-card p-6 flex flex-col items-center justify-center bg-card rounded-xl border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Win Rate</p>
          <p className="text-2xl font-bold text-foreground">{winRate}%</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-center justify-center bg-card rounded-xl border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Total Entries</p>
          <p className="text-2xl font-bold text-foreground">{pnl.length}</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-center justify-center bg-card rounded-xl border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Current Equity</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(currentEquity)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-6">
        {/* Equity Curve */}
        <div className="glass-card p-6 bg-card rounded-xl border border-border/50">
          <h3 className="text-base font-semibold mb-6 text-foreground">Equity Curve</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="eqGradAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}
                  formatter={(value: any) => [formatCurrency(value), "Equity"]}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#eqGradAcc)"
                  activeDot={{ r: 4, strokeWidth: 0, fill: "#10b981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily P&L Distribution */}
        <div className="glass-card p-6 bg-card rounded-xl border border-border/50">
          <h3 className="text-base font-semibold mb-6 text-foreground">Daily P&L Distribution</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBars} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value / 1000}k`}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-card p-2 shadow-sm text-xs">
                          <div className="text-muted-foreground mb-1">{data.fullDate}</div>
                          <div className={`font-bold ${data.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {data.pnl > 0 ? "+" : ""}{formatCurrency(data.pnl)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {dailyBars.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* P&L History Table */}
      <div className="glass-card bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-base">P&L History</h3>
        </div>
        {pnl.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No P&L entries recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Index</th>
                  <th className="px-6 py-4 text-right">P&L</th>
                  <th className="px-6 py-4 text-right">P&L %</th>
                  <th className="px-6 py-4 text-right">Capital</th>
                  <th className="px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {/* robust reverse sort for display: newest first */}
                {pnl.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry) => {
                  const pnlAmount = Number(entry.pnl_amount);
                  const capital = Number(entry.capital_used);
                  const roi = capital > 0 ? (pnlAmount / capital) * 100 : 0;
                  const isProfit = pnlAmount >= 0;

                  return (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {format(parseDateLocal(String(entry.date)), "yyyy-MM-dd")}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="font-mono text-[10px] tracking-wider font-normal">
                          {entry.index_name}
                        </Badge>
                      </td>
                      <td className={`px-6 py-4 font-mono text-sm font-bold whitespace-nowrap text-right ${isProfit ? "text-emerald-500" : "text-red-500"}`}>
                        {isProfit ? "+" : ""}{formatCurrency(pnlAmount)}
                      </td>
                      <td className={`px-6 py-4 font-mono text-xs text-right ${roi >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {roi > 0 ? "+" : ""}{roi.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap text-right">
                        {formatCurrency(capital)}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground truncate max-w-[200px]">
                        {entry.notes || "—"}
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

export default TradingAccountProfile;
