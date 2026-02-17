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
      const totalCapital = totalAllocated + totalPnL;
      const netProfit = totalPnL;
      const wins = pnl.filter((e) => Number(e.pnl_amount) > 0).length;
      const winRate = pnl.length > 0 ? parseFloat(((wins / pnl.length) * 100).toFixed(1)) : 0;
      const pendingReturns = returns
        .filter((r) => r.status === "pending")
        .reduce((s, r) => s + Number(r.amount), 0);

      // Total Investor Capital = sum of (invested - delivered capital returns) per investor
      const now = new Date();
      const totalInvested = allInvestments.reduce((s, i) => s + Number(i.amount), 0);
      const totalDelivered = allWaiting
        .filter((e) => {
          if (e.delivered) return true;
          const diffDays = (now.getTime() - new Date(e.initialized_date).getTime()) / (1000 * 60 * 60 * 24);
          return diffDays >= 60;
        })
        .reduce((s, e) => s + Number(e.amount), 0);
      const totalInvestorCapital = totalInvested - totalDelivered;
      const internalCapital = totalCapital - totalInvestorCapital;

      // Build equity curve from P&L
      let equity = totalAllocated > 0 ? totalAllocated : 0;
      const equityCurve = pnl.map((e) => {
        equity += Number(e.pnl_amount);
        const d = new Date(e.date);
        return {
          date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          equity,
        };
      });

      const startEquity = equityCurve.length > 0 ? equityCurve[0].equity - Number(pnl[0].pnl_amount) : totalCapital;
      const endEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : startEquity;
      const equityGrowth = startEquity > 0 ? parseFloat((((endEquity - startEquity) / startEquity) * 100).toFixed(1)) : 0;

      return {
        totalInvestors: investors.length,
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
