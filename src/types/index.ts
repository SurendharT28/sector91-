export interface Investor {
  id: string;
  clientId: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  investmentAmount: number;
  promisedReturn: number;
  joiningDate: string;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  updatedAt: string;
}

export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  capitalAllocated: number;
  status: "active" | "inactive";
  createdAt: string;
}

export interface DailyPnL {
  id: string;
  accountId: string;
  date: string;
  index: "NIFTY" | "BANKNIFTY" | "OTHER";
  pnlAmount: number;
  capitalUsed: number;
  notes: string;
  pnlPercent: number;
}

export interface MonthlyReturn {
  id: string;
  investorId: string;
  month: string;
  amount: number;
  status: "generated" | "paid" | "pending";
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  referenceId: string;
  module: string;
  notes: string;
}

export interface DashboardStats {
  totalInvestors: number;
  totalCapital: number;
  netProfit: number;
  monthlyPerformance: number;
  pendingReturns: number;
  winRate: number;
  totalTrades: number;
  equityGrowth: number;
}
