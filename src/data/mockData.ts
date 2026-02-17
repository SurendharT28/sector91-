import { Investor, TradingAccount, DailyPnL, AuditEntry, DashboardStats } from "@/types";

export const mockStats: DashboardStats = {
  totalInvestors: 12,
  totalCapital: 4850000,
  netProfit: 623400,
  monthlyPerformance: 8.4,
  pendingReturns: 185000,
  winRate: 68.5,
  totalTrades: 342,
  equityGrowth: 12.8,
};

export const mockInvestors: Investor[] = [
  {
    id: "1", clientId: "S91-INV-001", fullName: "Rajesh Kumar", email: "rajesh@email.com",
    phone: "+91 98765 43210", address: "Mumbai, MH", investmentAmount: 500000,
    promisedReturn: 12, joiningDate: "2024-01-15", status: "active",
    createdAt: "2024-01-15", updatedAt: "2024-01-15",
  },
  {
    id: "2", clientId: "S91-INV-002", fullName: "Priya Sharma", email: "priya@email.com",
    phone: "+91 87654 32109", address: "Delhi, DL", investmentAmount: 750000,
    promisedReturn: 15, joiningDate: "2024-02-20", status: "active",
    createdAt: "2024-02-20", updatedAt: "2024-02-20",
  },
  {
    id: "3", clientId: "S91-INV-003", fullName: "Amit Patel", email: "amit@email.com",
    phone: "+91 76543 21098", address: "Ahmedabad, GJ", investmentAmount: 300000,
    promisedReturn: 10, joiningDate: "2024-03-10", status: "pending",
    createdAt: "2024-03-10", updatedAt: "2024-03-10",
  },
  {
    id: "4", clientId: "S91-INV-004", fullName: "Sneha Reddy", email: "sneha@email.com",
    phone: "+91 65432 10987", address: "Hyderabad, TS", investmentAmount: 1000000,
    promisedReturn: 18, joiningDate: "2024-04-05", status: "active",
    createdAt: "2024-04-05", updatedAt: "2024-04-05",
  },
];

export const mockAccounts: TradingAccount[] = [
  { id: "1", name: "Alpha Strategy", broker: "Zerodha", capitalAllocated: 2000000, status: "active", createdAt: "2024-01-01" },
  { id: "2", name: "Index Scalping", broker: "Angel One", capitalAllocated: 1500000, status: "active", createdAt: "2024-02-01" },
  { id: "3", name: "Swing Portfolio", broker: "Groww", capitalAllocated: 1350000, status: "inactive", createdAt: "2024-03-15" },
];

export const mockPnL: DailyPnL[] = Array.from({ length: 30 }, (_, i) => {
  const pnl = Math.round((Math.random() - 0.35) * 50000);
  const capital = 500000;
  return {
    id: String(i + 1),
    accountId: "1",
    date: new Date(2025, 0, i + 1).toISOString().split("T")[0],
    index: i % 2 === 0 ? "NIFTY" as const : "BANKNIFTY" as const,
    pnlAmount: pnl,
    capitalUsed: capital,
    notes: "",
    pnlPercent: parseFloat(((pnl / capital) * 100).toFixed(2)),
  };
});

export const mockAudit: AuditEntry[] = [
  { id: "1", timestamp: "2025-01-15T10:30:00Z", action: "Created Investor", referenceId: "S91-INV-001", module: "Investors", notes: "New investor onboarded" },
  { id: "2", timestamp: "2025-01-16T14:20:00Z", action: "Added Daily P&L", referenceId: "ACC-001", module: "Trading", notes: "NIFTY +₹12,500" },
  { id: "3", timestamp: "2025-01-17T09:15:00Z", action: "Uploaded Agreement", referenceId: "S91-INV-002", module: "Agreements", notes: "Signed agreement PDF" },
  { id: "4", timestamp: "2025-01-18T16:45:00Z", action: "Updated Return", referenceId: "S91-INV-001", module: "Returns", notes: "January payout marked paid" },
  { id: "5", timestamp: "2025-01-19T11:00:00Z", action: "Created Account", referenceId: "ACC-003", module: "Trading", notes: "Swing Portfolio account added" },
];

export const mockEquityCurve = (() => {
  let equity = 2000000;
  return Array.from({ length: 30 }, (_, i) => {
    equity += Math.round((Math.random() - 0.35) * 40000);
    return {
      date: `Jan ${i + 1}`,
      equity,
    };
  });
})();
