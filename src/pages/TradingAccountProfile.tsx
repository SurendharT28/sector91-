import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTradingAccounts, useDailyPnL } from "@/hooks/useTrading";
import { downloadWeeklyPnLReport, downloadMonthlyPnLReport } from "@/lib/reportUtils";

const formatCurrency = (n: number) => "₹" + n.toLocaleString("en-IN");

const TradingAccountProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: accounts, isLoading: accLoading } = useTradingAccounts();
  const { data: pnlData, isLoading: pnlLoading } = useDailyPnL(id);

  const account = accounts?.find((a) => a.id === id);
  const pnl = pnlData || [];
  const totalPnL = pnl.reduce((s, e) => s + Number(e.pnl_amount), 0);
  const wins = pnl.filter((e) => Number(e.pnl_amount) > 0).length;
  const winRate = pnl.length > 0 ? ((wins / pnl.length) * 100).toFixed(1) : "0";

  let equity = Number(account?.capital_allocated || 0);
  const equityCurve = pnl.map((e) => {
    equity += Number(e.pnl_amount);
    const d = new Date(e.date);
    return { date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), equity };
  });

  const dailyBars = pnl.map((e) => ({
    date: e.date.slice(5),
    pnl: Number(e.pnl_amount),
    fill: Number(e.pnl_amount) >= 0 ? "hsl(160,84%,39%)" : "hsl(0,72%,51%)",
  }));

  if (accLoading || pnlLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/trading")} className="gap-2"><ArrowLeft className="h-4 w-4" />Back</Button>
        <p className="text-muted-foreground">Account not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/trading")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{account.name}</h1>
              <Badge variant="outline" className={`text-[10px] ${account.status === "active" ? "bg-profit/15 text-profit border-profit/30" : "bg-muted text-muted-foreground border-border"}`}>{account.status}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Broker: {account.broker || "N/A"} • Capital: {formatCurrency(Number(account.capital_allocated))}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto ml-11 sm:ml-0">
              <Download className="h-4 w-4" /> Reports
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => downloadWeeklyPnLReport(pnl, accounts || [], id)}>Weekly P&L Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadMonthlyPnLReport(pnl, accounts || [], id)}>Monthly P&L Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="glass-card p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground">Net P&L</p><p className={`font-mono text-base sm:text-xl font-bold ${totalPnL >= 0 ? "text-profit" : "text-loss"}`}>{formatCurrency(totalPnL)}</p></div>
        <div className="glass-card p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground">Win Rate</p><p className="font-mono text-base sm:text-xl font-bold text-foreground">{winRate}%</p></div>
        <div className="glass-card p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground">Total Entries</p><p className="font-mono text-base sm:text-xl font-bold text-foreground">{pnl.length}</p></div>
        <div className="glass-card p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground">Current Equity</p><p className="font-mono text-base sm:text-xl font-bold text-foreground">{formatCurrency(Number(account.capital_allocated) + totalPnL)}</p></div>
      </div>

      {pnl.length > 0 && (
        <>
          <div className="glass-card p-4 sm:p-6">
            <h3 className="mb-4 text-xs sm:text-sm font-semibold text-foreground">Equity Curve</h3>
            <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
              <AreaChart data={equityCurve}>
                <defs><linearGradient id="eqGradAcc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(160,84%,39%)" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(160,84%,39%)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215,12%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215,12%,50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} width={50} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px", fontSize: 11, color: "hsl(210,20%,92%)" }} />
                <Area type="monotone" dataKey="equity" stroke="hsl(160,84%,39%)" strokeWidth={2} fill="url(#eqGradAcc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-4 sm:p-6">
            <h3 className="mb-4 text-xs sm:text-sm font-semibold text-foreground">Daily P&L Distribution</h3>
            <ResponsiveContainer width="100%" height={180} className="sm:!h-[220px]">
              <BarChart data={dailyBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215,12%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215,12%,50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} width={45} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px", fontSize: 11, color: "hsl(210,20%,92%)" }} />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="glass-card overflow-hidden">
        <h3 className="px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold text-foreground border-b border-border">P&L History</h3>
        {pnl.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No P&L entries yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 sm:px-5 py-3">Date</th><th className="px-4 sm:px-5 py-3">Index</th><th className="px-4 sm:px-5 py-3">P&L</th><th className="px-4 sm:px-5 py-3">P&L %</th><th className="px-4 sm:px-5 py-3">Capital</th><th className="px-4 sm:px-5 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {pnl.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-4 sm:px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{entry.date}</td>
                    <td className="px-4 sm:px-5 py-3"><Badge variant="outline" className="font-mono text-[10px]">{entry.index_name}</Badge></td>
                    <td className={`px-4 sm:px-5 py-3 font-mono text-sm font-medium whitespace-nowrap ${Number(entry.pnl_amount) >= 0 ? "text-profit" : "text-loss"}`}>
                      {Number(entry.pnl_amount) >= 0 ? "+" : ""}{formatCurrency(Number(entry.pnl_amount))}
                    </td>
                    <td className={`px-4 sm:px-5 py-3 font-mono text-xs ${Number(entry.pnl_percent) >= 0 ? "text-profit" : "text-loss"}`}>
                      {Number(entry.pnl_percent) >= 0 ? "+" : ""}{Number(entry.pnl_percent)}%
                    </td>
                    <td className="px-4 sm:px-5 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{formatCurrency(Number(entry.capital_used))}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-muted-foreground">{entry.notes || "—"}</td>
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

export default TradingAccountProfile;
