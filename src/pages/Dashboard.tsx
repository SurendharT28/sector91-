import {
  Users, Wallet, TrendingUp, BarChart3, Clock, Target, Activity, ArrowUpRight, Download, Landmark, Building2, Receipt, MinusCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useTotalExpenses } from "@/hooks/useExpenses";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useTradingAccounts, useDailyPnL } from "@/hooks/useTrading";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadWeeklyPnLReport, downloadMonthlyPnLReport, downloadPastMonthPnLReport } from "@/lib/reportUtils";

const formatCurrency = (n: number | undefined | null) => "₹" + (n ?? 0).toLocaleString("en-IN");

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: totalExpenses = 0 } = useTotalExpenses();
  const { data: auditData, isLoading: auditLoading } = useAuditLog(5);
  const auditEntries = auditData?.data || [];
  const { data: accounts } = useTradingAccounts();
  const { data: pnlData } = useDailyPnL();

  if (statsLoading) {
    return (
      <div className="space-y-8">
        <div><h1 className="text-2xl font-bold text-foreground">Dashboard</h1></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const s = stats!;
  const netPnL = (s.netProfit ?? 0) - totalExpenses;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Portfolio overview & trading performance</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
              <Download className="h-4 w-4" /> Reports
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={() => downloadWeeklyPnLReport(pnlData || [], accounts || [])}>
              Weekly Consolidated P&L
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadMonthlyPnLReport(pnlData || [], accounts || [])}>
              Monthly Consolidated P&L
            </DropdownMenuItem>
            {[1, 2, 3].map((m) => {
              const d = new Date();
              d.setMonth(d.getMonth() - m);
              const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
              return (
                <DropdownMenuItem key={m} onClick={() => downloadPastMonthPnLReport(pnlData || [], accounts || [], m)}>
                  {label} P&L
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Investors" value={String(s.totalInvestors)} change="+2 this month" changeType="profit" icon={Users} />
        <StatCard label="Capital Managed" value={formatCurrency(s.totalCapital)} change={`₹${((s.totalCapital ?? 0) / 100000).toFixed(1)}L`} changeType="profit" icon={Wallet} />
        <StatCard label="Total Profit and Loss" value={formatCurrency(s.netProfit)} change={`${s.monthlyPerformance >= 0 ? "+" : ""}${s.monthlyPerformance}% MTD`} changeType={s.netProfit >= 0 ? "profit" : "loss"} icon={TrendingUp} />
        <StatCard label="Win Rate" value={`${s.winRate}%`} change={`${s.totalTrades} trades`} changeType="neutral" icon={Target} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Investor Capital" value={formatCurrency(s.totalInvestorCapital)} change="consolidated remaining" changeType="neutral" icon={Landmark} />
        <StatCard label="Internal Capital" value={formatCurrency(s.internalCapital)} change="firm's own capital" changeType={s.internalCapital >= 0 ? "profit" : "loss"} icon={Building2} />
        <StatCard label="Expense" value={formatCurrency(totalExpenses)} change="total expenses" changeType="loss" icon={Receipt} />
        <StatCard label="Net Profit or Loss" value={formatCurrency(netPnL)} change="after expenses" changeType={netPnL >= 0 ? "profit" : "loss"} icon={MinusCircle} />
        <StatCard label="Pending Returns" value={formatCurrency(s.pendingReturns)} change="pending payouts" changeType="neutral" icon={Clock} />
        <StatCard label="Equity Growth" value={`${s.equityGrowth}%`} change="Overall" changeType={s.equityGrowth >= 0 ? "profit" : "loss"} icon={BarChart3} />
        <StatCard label="Total Trades" value={String(s.totalTrades)} change={`${s.winRate}% win rate`} changeType="profit" icon={Activity} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card lg:col-span-2 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-foreground">Equity Curve</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Running performance</p>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1">
              <ArrowUpRight className="h-3 w-3 text-profit" />
              <span className="font-mono text-xs font-medium text-profit">
                {s.equityGrowth >= 0 ? "+" : ""}{s.equityGrowth}%
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220} className="sm:!h-[280px]">
            <AreaChart data={s.equityCurve}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--profit))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--profit))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} width={50} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11, color: "hsl(var(--foreground))" }} formatter={(value: number) => [formatCurrency(value), "Equity"]} />
              <Area type="monotone" dataKey="equity" stroke="hsl(var(--profit))" strokeWidth={2} fill="url(#eqGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Recent Activity</h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {auditLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)
            ) : (
              (auditEntries || []).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{entry.action}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{entry.notes}</p>
                    <p className="font-mono text-[10px] text-muted-foreground/60">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
