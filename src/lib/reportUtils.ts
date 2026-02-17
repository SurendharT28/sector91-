/**
 * Report generation utilities for CSV downloads
 */

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(val: string | number | null | undefined) {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

// ─── Trading P&L Reports ───

type PnLEntry = {
  date: string;
  index_name: string | null;
  pnl_amount: number | null;
  pnl_percent: number | null;
  capital_used: number | null;
  account_id: string;
  notes: string | null;
};

type TradingAccount = {
  id: string;
  name: string;
  broker: string | null;
  capital_allocated: number | null;
};

function filterByDateRange(entries: PnLEntry[], startDate: Date, endDate: Date) {
  return entries.filter((e) => {
    const d = new Date(e.date);
    return d >= startDate && d <= endDate;
  });
}

export function downloadWeeklyPnLReport(pnl: PnLEntry[], accounts: TradingAccount[], accountId?: string) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday
  weekStart.setHours(0, 0, 0, 0);

  const filtered = filterByDateRange(pnl, weekStart, now).filter(
    (e) => !accountId || e.account_id === accountId
  );

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const title = accountId
    ? `Weekly P&L Report - ${accountMap[accountId] || "Account"}`
    : "Weekly Consolidated P&L Report";

  const totalPnL = filtered.reduce((s, e) => s + Number(e.pnl_amount || 0), 0);
  const wins = filtered.filter((e) => Number(e.pnl_amount) > 0).length;
  const winRate = filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(1) : "0";

  let csv = `${title}\n`;
  csv += `Period: ${fmtDate(weekStart.toISOString())} to ${fmtDate(now.toISOString())}\n`;
  csv += `Total P&L: ${fmt(totalPnL)}\n`;
  csv += `Win Rate: ${winRate}% (${wins}/${filtered.length} trades)\n\n`;
  csv += "Date,Account,Index,P&L Amount,P&L %,Capital Used,Notes\n";
  filtered.forEach((e) => {
    csv += [
      e.date,
      escapeCsv(accountMap[e.account_id] || ""),
      e.index_name || "",
      Number(e.pnl_amount || 0),
      Number(e.pnl_percent || 0) + "%",
      Number(e.capital_used || 0),
      escapeCsv(e.notes),
    ].join(",") + "\n";
  });

  const suffix = accountId ? accountMap[accountId]?.replace(/\s+/g, "_") || accountId.slice(0, 8) : "consolidated";
  downloadCSV(`weekly_pnl_${suffix}_${now.toISOString().slice(0, 10)}.csv`, csv);
}

export function downloadMonthlyPnLReport(pnl: PnLEntry[], accounts: TradingAccount[], accountId?: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = filterByDateRange(pnl, monthStart, now).filter(
    (e) => !accountId || e.account_id === accountId
  );

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const title = accountId
    ? `Monthly P&L Report - ${accountMap[accountId] || "Account"}`
    : "Monthly Consolidated P&L Report";

  const totalPnL = filtered.reduce((s, e) => s + Number(e.pnl_amount || 0), 0);
  const wins = filtered.filter((e) => Number(e.pnl_amount) > 0).length;
  const winRate = filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(1) : "0";

  let csv = `${title}\n`;
  csv += `Period: ${fmtDate(monthStart.toISOString())} to ${fmtDate(now.toISOString())}\n`;
  csv += `Total P&L: ${fmt(totalPnL)}\n`;
  csv += `Win Rate: ${winRate}% (${wins}/${filtered.length} trades)\n\n`;
  csv += "Date,Account,Index,P&L Amount,P&L %,Capital Used,Notes\n";
  filtered.forEach((e) => {
    csv += [
      e.date,
      escapeCsv(accountMap[e.account_id] || ""),
      e.index_name || "",
      Number(e.pnl_amount || 0),
      Number(e.pnl_percent || 0) + "%",
      Number(e.capital_used || 0),
      escapeCsv(e.notes),
    ].join(",") + "\n";
  });

  const suffix = accountId ? accountMap[accountId]?.replace(/\s+/g, "_") || accountId.slice(0, 8) : "consolidated";
  downloadCSV(`monthly_pnl_${suffix}_${now.toISOString().slice(0, 10)}.csv`, csv);
}

export function downloadPastMonthPnLReport(pnl: PnLEntry[], accounts: TradingAccount[], monthsAgo: number) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59);

  const filtered = filterByDateRange(pnl, monthStart, monthEnd);

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
  const monthLabel = monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const title = `Consolidated P&L Report - ${monthLabel}`;

  const totalPnL = filtered.reduce((s, e) => s + Number(e.pnl_amount || 0), 0);
  const wins = filtered.filter((e) => Number(e.pnl_amount) > 0).length;
  const winRate = filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(1) : "0";

  let csv = `${title}\n`;
  csv += `Period: ${fmtDate(monthStart.toISOString())} to ${fmtDate(monthEnd.toISOString())}\n`;
  csv += `Total P&L: ${fmt(totalPnL)}\n`;
  csv += `Win Rate: ${winRate}% (${wins}/${filtered.length} trades)\n\n`;
  csv += "Date,Account,Index,P&L Amount,P&L %,Capital Used,Notes\n";
  filtered.forEach((e) => {
    csv += [
      e.date,
      escapeCsv(accountMap[e.account_id] || ""),
      e.index_name || "",
      Number(e.pnl_amount || 0),
      Number(e.pnl_percent || 0) + "%",
      Number(e.capital_used || 0),
      escapeCsv(e.notes),
    ].join(",") + "\n";
  });

  const monthSlug = monthStart.toISOString().slice(0, 7);
  downloadCSV(`monthly_pnl_consolidated_${monthSlug}.csv`, csv);
}

// ─── Investor Report ───

type Investment = { amount: number; invested_date: string; notes: string | null; promised_return: number | null };
type MonthlyReturn = { month: string; amount: number | null; return_percent: number | null };
type WaitingEntry = { amount: number; initialized_date: string; delivered: boolean; delivered_at: string | null };

export function downloadInvestorReport(
  investor: { full_name: string; client_id: string | null; email: string | null; phone: string | null; address: string | null; joining_date: string | null },
  investments: Investment[],
  returns: MonthlyReturn[],
  waitingEntries: WaitingEntry[],
) {
  const now = new Date();
  const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
  const totalReturned = returns.reduce((s, r) => s + Number(r.amount || 0), 0);

  const deliveredEntries = waitingEntries.filter((e) => {
    if (e.delivered) return true;
    const diff = (now.getTime() - new Date(e.initialized_date).getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 60;
  });
  const totalCapitalReturned = deliveredEntries.reduce((s, e) => s + Number(e.amount), 0);
  const remainingCapital = totalInvested - totalCapitalReturned;

  const fmtMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  let csv = `Investor Report - ${investor.full_name}\n`;
  csv += `Client ID: ${investor.client_id || "N/A"}\n`;
  csv += `Email: ${investor.email || "N/A"}\n`;
  csv += `Phone: ${investor.phone || "N/A"}\n`;
  csv += `Address: ${investor.address || "N/A"}\n`;
  csv += `Joining Date: ${investor.joining_date ? fmtDate(investor.joining_date) : "N/A"}\n`;
  csv += `Report Date: ${fmtDate(now.toISOString())}\n\n`;

  csv += `--- Summary ---\n`;
  csv += `Total Capital Invested,${totalInvested}\n`;
  csv += `Total Capital Returned,${totalCapitalReturned}\n`;
  csv += `Remaining Capital,${remainingCapital}\n`;
  csv += `Total Monthly Returns Paid,${totalReturned}\n\n`;

  csv += `--- Investments ---\n`;
  csv += `Date,Amount,Promised Return %,Notes\n`;
  investments.forEach((i) => {
    csv += [fmtDate(i.invested_date), Number(i.amount), Number(i.promised_return || 0) + "%", escapeCsv(i.notes)].join(",") + "\n";
  });

  csv += `\n--- Monthly Returns ---\n`;
  csv += `Month,Amount,Return %\n`;
  returns.forEach((r) => {
    csv += [fmtMonth(r.month), Number(r.amount || 0), Number(r.return_percent || 0) + "%"].join(",") + "\n";
  });

  csv += `\n--- Capital Returns ---\n`;
  csv += `Initialized Date,Amount,Status,Delivered Date\n`;
  waitingEntries.forEach((e) => {
    const isDelivered = e.delivered || (now.getTime() - new Date(e.initialized_date).getTime()) / (1000 * 60 * 60 * 24) >= 60;
    csv += [
      fmtDate(e.initialized_date),
      Number(e.amount),
      isDelivered ? "Delivered" : "Waiting",
      e.delivered_at ? fmtDate(e.delivered_at) : isDelivered ? "Auto-matured" : "Pending",
    ].join(",") + "\n";
  });

  const safeName = investor.full_name.replace(/\s+/g, "_");
  downloadCSV(`investor_report_${safeName}_${now.toISOString().slice(0, 10)}.csv`, csv);
}
