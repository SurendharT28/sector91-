import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const [investorsRes, pnlRes, returnsRes, accountsRes, investmentsRes, waitingRes] = await Promise.all([
        supabase.from("investors").select("*"),
        supabase.from("daily_pnl").select("*").order("date", { ascending: true }),
        supabase.from("monthly_returns").select("*"),
        supabase.from("trading_accounts").select("*"),
        supabase.from("investments").select("*"),
        supabase.from("waiting_period_entries").select("*"),
      ]);

      if (investorsRes.error) throw investorsRes.error;
      if (pnlRes.error) throw pnlRes.error;
      if (returnsRes.error) throw returnsRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (investmentsRes.error) throw investmentsRes.error;
      if (waitingRes.error) throw waitingRes.error;

      const investors = investorsRes.data || [];
      const pnl = pnlRes.data || [];
      const returns = returnsRes.data || [];
      const accounts = accountsRes.data || [];
      const allInvestments = investmentsRes.data || [];
      const allWaiting = waitingRes.data || [];

      const totalAllocated = accounts.reduce((s, a) => s + Number(a.capital_allocated), 0);
      const totalPnL = pnl.reduce((s, e) => s + Number(e.pnl_amount), 0);
      const netProfit = totalPnL;
      const wins = pnl.filter((e) => Number(e.pnl_amount) > 0).length;
      const winRate = pnl.length > 0 ? parseFloat(((wins / pnl.length) * 100).toFixed(1)) : 0;
      const pendingReturns = returns
        .filter((r) => r.status === "pending")
        .reduce((s, r) => s + Number(r.amount), 0);

      const totalInvested = allInvestments.reduce((s, i) => s + Number(i.amount), 0);
      const now = new Date();
      // Calculate total delivered capital (returned to investors)
      const totalDelivered = allWaiting
        .filter((e) => {
          if (e.delivered) return true;
          const diffDays = (now.getTime() - new Date(e.initialized_date).getTime()) / (1000 * 60 * 60 * 24);
          return diffDays >= 60;
        })
        .reduce((s, e) => s + Number(e.amount), 0);

      // Total Capital = (Allocated - Delivered) + PnL
      // Accounts for capital leaving the system when investors are paid out
      const activeAllocated = Math.max(0, totalAllocated - totalDelivered);
      const totalCapital = activeAllocated + totalPnL;

      const totalInvestorCapital = totalInvested - totalDelivered;
      // Internal Capital = Total Capital - Investor Capital (floored at 0)
      const internalCapital = Math.max(0, totalCapital - totalInvestorCapital);

      // Build equity curve from P&L
      // Baseline starts from active allocated capital
      let equity = activeAllocated;
      const equityCurve = pnl.map((e) => {
        equity += Number(e.pnl_amount);
        // Correct date parsing for local timezone (YYYY-MM-DD -> Date)
        const [y, m, d] = String(e.date).split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        return {
          date: dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          equity,
        };
      });

      const startEquity = equityCurve.length > 0 ? equityCurve[0].equity - Number(pnl[0].pnl_amount) : activeAllocated;
      const endEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : startEquity;
      const equityGrowth = startEquity > 0 ? parseFloat((((endEquity - startEquity) / startEquity) * 100).toFixed(1)) : 0;

      // Calculate new investors this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newInvestorsCount = investors.filter(i => {
        const d = new Date(i.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      return {
        totalInvestors: investors.length,
        newInvestorsCount,
        totalCapital,
        netProfit,
        monthlyPerformance: equityGrowth,
        pendingReturns,
        winRate,
        totalTrades: pnl.length,
        equityGrowth,
        equityCurve,
        totalInvestorCapital,
        internalCapital,
      };
    },
  });
};
