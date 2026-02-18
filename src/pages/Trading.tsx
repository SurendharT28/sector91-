import { useState } from "react";
import { Plus, CalendarIcon, Pencil, Trash2, MoreVertical, Search, CheckCircle, PauseCircle, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import {
  useTradingAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useDailyPnL,
  useCreatePnLEntry,
  useEditPnLEntry,
  useDeletePnLEntry
} from "@/hooks/useTrading";
import { useLogAction } from "@/hooks/useAuditLog";
import { tradingAccountSchema, pnlSchema, type TradingAccountFormValues, type PnLFormValues } from "@/schemas/tradingSchema";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

const statusConfig: Record<string, { className: string; icon: React.ReactNode }> = {
  active: { className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: <CheckCircle className="h-3 w-3" /> },
  paused: { className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", icon: <PauseCircle className="h-3 w-3" /> },
  closed: { className: "bg-destructive/15 text-destructive border-destructive/30", icon: <XCircle className="h-3 w-3" /> },
};

const Trading = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Data Hooks
  const { data: accounts, isLoading: accountsLoading } = useTradingAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const { data: pnlData, isLoading: pnlLoading } = useDailyPnL();
  const addPnL = useCreatePnLEntry();
  const updatePnL = useEditPnLEntry();
  const deletePnL = useDeletePnLEntry();
  const logAction = useLogAction();

  // State
  const [activeTab, setActiveTab] = useState("accounts");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pnlDialogOpen, setPnlDialogOpen] = useState(false);
  const [editingPnl, setEditingPnl] = useState<any>(null);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Forms
  const accountForm = useForm<TradingAccountFormValues>({
    resolver: zodResolver(tradingAccountSchema),
    defaultValues: { name: "", broker: "", capital_allocated: 0, status: "active" },
  });

  const pnlForm = useForm<PnLFormValues>({
    resolver: zodResolver(pnlSchema),
    defaultValues: {
      account_id: "",
      date: new Date(),
      index_name: "NIFTY",
      custom_index: "",
      pnl_amount: 0,
      capital_used: 0,
      notes: "",
    },
  });

  // Derived Data
  const filteredPnL = selectedAccount === "all"
    ? pnlData || []
    : (pnlData || []).filter((p) => p.account_id === selectedAccount);

  // Stats Calculation
  const totalPnL = filteredPnL.reduce((sum, p) => sum + Number(p.pnl_amount), 0);
  const winRate = filteredPnL.length > 0
    ? (filteredPnL.filter((p) => Number(p.pnl_amount) > 0).length / filteredPnL.length) * 100
    : 0;

  // Calculate unique trading days for accurate average
  const uniqueDays = new Set(filteredPnL.map(p => p.date)).size;
  const avgDailyPnL = uniqueDays > 0 ? totalPnL / uniqueDays : 0;

  // Helper to safely parse YYYY-MM-DD to local Date
  const parseDateLocal = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // Chart Data preparation (Aggregated by Date)
  // First, aggregate per day
  const dailyAggregated = Object.values(
    filteredPnL.reduce((acc: any, p) => {
      const dateStr = String(p.date);
      if (!acc[dateStr]) {
        acc[dateStr] = {
          dateStr,
          dateObj: parseDateLocal(dateStr),
          pnl: 0,
          capital: 0,
        };
      }
      acc[dateStr].pnl += Number(p.pnl_amount);
      acc[dateStr].capital += Number(p.capital_used);
      return acc;
    }, {})
  ).sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime());

  // Then calculate cumulative equity
  let runningEquity = 0;
  const chartData = dailyAggregated.map((item: any) => {
    runningEquity += item.pnl;
    return {
      date: format(item.dateObj, "dd MMM"),
      pnl: item.pnl,
      equity: runningEquity,
      capital: item.capital,
    };
  });

  // Default PnL reset helper — includes custom_index to avoid stale value
  const getDefaultPnLValues = (accountId?: string): PnLFormValues => ({
    account_id: accountId && accountId !== "all" ? accountId : "",
    date: new Date(),
    index_name: "NIFTY",
    custom_index: "",
    pnl_amount: 0,
    capital_used: 0,
    notes: "",
  });

  // Handlers
  const onAccountSubmit = async (data: TradingAccountFormValues) => {
    try {
      if (editingAccount) {
        await updateAccount.mutateAsync({ id: editingAccount.id, ...data });
        logAction.mutate({ action: "Updated Trading Account", referenceId: editingAccount.id, module: "Trading", notes: `Updated account ${data.name}` });
        toast({ title: "Account updated" });
      } else {
        const res = await createAccount.mutateAsync(data);
        logAction.mutate({ action: "Created Trading Account", referenceId: res.id, module: "Trading", notes: `Created account ${data.name}` });
        toast({ title: "Account created" });
      }
      setAccountDialogOpen(false);
      setEditingAccount(null);
      accountForm.reset();
    } catch {
      toast({ title: "Error saving account", variant: "destructive" });
    }
  };

  const onPnLSubmit = async (data: PnLFormValues) => {
    try {
      const formattedDate = format(data.date, "yyyy-MM-dd");

      // Handle custom index logic
      const finalIndexName = data.index_name === "OTHER" && data.custom_index
        ? data.custom_index
        : data.index_name;

      // Create payload matching DB schema (exclude custom_index)
      const payload = {
        account_id: data.account_id,
        date: formattedDate,
        index_name: finalIndexName,
        pnl_amount: data.pnl_amount,
        capital_used: data.capital_used,
        notes: data.notes
      };

      if (editingPnl) {
        await updatePnL.mutateAsync({ id: editingPnl.id, ...payload });
        logAction.mutate({ action: "Updated PnL Log", referenceId: editingPnl.id, module: "Trading", notes: `${formattedDate} PnL updated` });
        toast({ title: "PnL entry updated" });
      } else {
        const res = await addPnL.mutateAsync(payload);
        logAction.mutate({ action: "Added PnL Log", referenceId: res.id, module: "Trading", notes: `${formattedDate} PnL added` });
        toast({ title: "PnL entry added" });
      }
      setPnlDialogOpen(false);
      setEditingPnl(null);
      pnlForm.reset(getDefaultPnLValues(selectedAccount));
    } catch {
      toast({ title: "Error saving PnL", variant: "destructive" });
    }
  };


  const handleDeletePnL = async (id: string, date: string) => {
    try {
      await deletePnL.mutateAsync(id);
      logAction.mutate({ action: "Deleted PnL Log", referenceId: id, module: "Trading", notes: `Deleted PnL for ${date}` });
      toast({ title: "Entry deleted" });
    } catch {
      toast({ title: "Error deleting entry", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    // Check if account has any PnL entries (using global pnlData to ensure safety)
    const associatedPnL = (pnlData || []).filter((p) => p.account_id === id);
    const count = associatedPnL.length;

    let message = `Are you sure you want to delete ${name}?`;
    if (count > 0) {
      message += `\n\nWARNING: This account has ${count} PnL entries. Deleting it will PERMANENTLY DELETE all these entries as well.`;
    } else {
      message += `\n\nThis action cannot be undone.`;
    }

    if (confirm(message)) {
      try {
        await deleteAccount.mutateAsync(id);
        logAction.mutate({ action: "Deleted Trading Account", referenceId: id, module: "Trading", notes: `Deleted account ${name}` });
        toast({ title: "Account deleted" });
        if (selectedAccount === id) setSelectedAccount("all");
      } catch {
        toast({ title: "Error deleting account", variant: "destructive" });
      }
    }
  };

  const openEditPnl = (pnl: any) => {
    setEditingPnl(pnl);
    pnlForm.reset({
      account_id: pnl.account_id,
      date: parseDateLocal(String(pnl.date)),
      index_name: pnl.index_name,
      custom_index: pnl.custom_index || "",
      pnl_amount: Number(pnl.pnl_amount),
      capital_used: Number(pnl.capital_used),
      notes: pnl.notes || "",
    });
    setPnlDialogOpen(true);
  };

  const openEditAccount = (acc: any) => {
    setEditingAccount(acc);
    accountForm.reset({
      name: acc.name,
      broker: acc.broker || "",
      capital_allocated: Number(acc.capital_allocated),
      status: acc.status || "active",
    });
    setAccountDialogOpen(true);
  };

  // Calculate total P&L for accounts display
  const getAccountPnL = (accountId: string) => {
    return (pnlData || [])
      .filter((p) => p.account_id === accountId)
      .reduce((sum, p) => sum + Number(p.pnl_amount), 0);
  };

  return (
    <div className="space-y-6 container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Trading</h1>
        <p className="text-muted-foreground">Accounts, P&L tracking & analytics</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="accounts" className="px-6 data-[state=active]:bg-background">Accounts</TabsTrigger>
            <TabsTrigger value="pnl" className="px-6 data-[state=active]:bg-background">Daily P&L</TabsTrigger>
            <TabsTrigger value="analytics" className="px-6 data-[state=active]:bg-background">Analytics</TabsTrigger>
          </TabsList>

          {/* Global Add PnL Button accessible from anywhere */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            onClick={() => {
              setEditingPnl(null);
              pnlForm.reset(getDefaultPnLValues(selectedAccount));
              setPnlDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Quick Add P&L
          </Button>
        </div>

        {/* ACCOUNTS TAB */}
        <TabsContent value="accounts" className="space-y-6">
          <Button
            onClick={() => {
              setEditingAccount(null);
              accountForm.reset();
              setAccountDialogOpen(true);
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Account
          </Button>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accountsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
              ))
            ) : accounts?.map((acc) => {
              const accPnL = getAccountPnL(acc.id);
              const isProfit = accPnL >= 0;
              const status = acc.status || "active";
              const statusCfg = statusConfig[status] || statusConfig.active;

              return (
                <div
                  key={acc.id}
                  className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-md cursor-pointer hover:border-primary/50"
                  onClick={() => navigate(`/trading/${acc.id}`)}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-xl uppercase tracking-wide">{acc.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">Broker: {acc.broker || "N/A"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`gap-1 text-[10px] font-medium uppercase ${statusCfg.className}`}>
                          {statusCfg.icon} {status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditAccount(acc); }}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id, acc.name); }} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-foreground">
                        {formatCurrency(Number(acc.capital_allocated) + accPnL)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className={isProfit ? "text-emerald-500" : "text-red-500"}>
                        {accPnL > 0 ? "+" : ""}{formatCurrency(accPnL)} P&L
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* DAILY P&L TAB */}
        <TabsContent value="pnl" className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => {
                setEditingPnl(null);
                pnlForm.reset(getDefaultPnLValues(selectedAccount));
                setPnlDialogOpen(true);
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
            >
              <Plus className="h-4 w-4 mr-2" /> Add P&L Entry
            </Button>

            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts?.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border bg-card">
            <div className="grid grid-cols-12 gap-4 p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Account</div>
              <div className="col-span-1 text-center">Index</div>
              <div className="col-span-2 text-right">P&L</div>
              <div className="col-span-1 text-center">ROI</div>
              <div className="col-span-3 text-right">Capital</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <div className="divide-y divide-border/50">
              {pnlLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading entries...</div>
              ) : filteredPnL.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No entries found. Start by adding a new P&L entry.
                </div>
              ) : (
                filteredPnL.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((pnl) => {
                  const isProfit = Number(pnl.pnl_amount) >= 0;
                  const roi = Number(pnl.capital_used) > 0
                    ? (Number(pnl.pnl_amount) / Number(pnl.capital_used)) * 100
                    : 0;

                  // Find account name
                  const accountName = accounts?.find(a => a.id === pnl.account_id)?.name || "Unknown";

                  return (
                    <div key={pnl.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors text-sm">
                      <div className="col-span-2 font-mono text-muted-foreground">
                        {format(parseDateLocal(String(pnl.date)), "yyyy-MM-dd")}
                      </div>
                      <div className="col-span-2 font-medium truncate" title={accountName}>
                        {accountName}
                      </div>
                      <div className="col-span-1 text-center">
                        <Badge variant="secondary" className="font-mono text-[10px] px-1">{pnl.index_name}</Badge>
                      </div>
                      <div className={`col-span-2 text-right font-bold font-mono ${isProfit ? "text-emerald-500" : "text-red-500"}`}>
                        {Number(pnl.pnl_amount) > 0 ? "+" : ""}{formatCurrency(Number(pnl.pnl_amount))}
                      </div>
                      <div className={`col-span-1 text-center font-mono text-xs ${roi >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {roi > 0 ? "+" : ""}{roi.toFixed(1)}%
                      </div>
                      <div className="col-span-3 text-right font-mono text-muted-foreground">
                        {formatCurrency(Number(pnl.capital_used))}
                      </div>
                      <div className="col-span-1 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditPnl(pnl)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeletePnL(pnl.id, String(pnl.date))} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-2">Net Profit</p>
              {pnlLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className={`text-3xl font-bold ${totalPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatCurrency(totalPnL)}
                </div>
              )}
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-2">Win Rate</p>
              {pnlLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{winRate.toFixed(1)}%</div>
              )}
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-2">Total Trades</p>
              {pnlLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{filteredPnL.length}</div>
              )}
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-2">Avg Daily P&L</p>
              {pnlLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className={`text-3xl font-bold ${avgDailyPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {formatCurrency(avgDailyPnL)}
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6">
            {/* Equity Curve */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Equity Curve</h3>
                <p className="text-sm text-muted-foreground">Cumulative P&L over time</p>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
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
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: any) => [formatCurrency(value), "Cumulative Equity"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPnL)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Capital Usage */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Capital Usage</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
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
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="capital" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={(open) => { setAccountDialogOpen(open); if (!open) { setEditingAccount(null); accountForm.reset(); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "Add Trading Account"}</DialogTitle>
          </DialogHeader>
          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
              <FormField
                control={accountForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Zerodha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accountForm.control}
                name="broker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Broker</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Kite" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accountForm.control}
                name="capital_allocated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capital Allocated</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={accountForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={createAccount.isPending || updateAccount.isPending}>
                {editingAccount ? "Update Account" : "Create Account"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* PnL Dialog */}
      <Dialog open={pnlDialogOpen} onOpenChange={(open) => { setPnlDialogOpen(open); if (!open) { setEditingPnl(null); pnlForm.reset(getDefaultPnLValues(selectedAccount)); } }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPnl ? "Edit Entry" : "Add P&L Entry"}</DialogTitle>
          </DialogHeader>
          <Form {...pnlForm}>
            <form onSubmit={pnlForm.handleSubmit(onPnLSubmit)} className="space-y-4">
              <FormField
                control={pnlForm.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts?.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pnlForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={pnlForm.control}
                  name="index_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Index</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select index" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NIFTY">NIFTY 50</SelectItem>
                          <SelectItem value="BANKNIFTY">BANKNIFTY</SelectItem>
                          <SelectItem value="FINNIFTY">FINNIFTY</SelectItem>
                          <SelectItem value="MIDCPNIFTY">MIDCPNIFTY</SelectItem>
                          <SelectItem value="SENSEX">SENSEX</SelectItem>
                          <SelectItem value="BANKEX">BANKEX</SelectItem>
                          <SelectItem value="STOCKS">STOCKS</SelectItem>
                          <SelectItem value="OTHER">OTHER</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pnlForm.control}
                  name="custom_index"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="If Other..."
                          {...field}
                          disabled={pnlForm.watch("index_name") !== "OTHER"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={pnlForm.control}
                  name="capital_used"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capital Used</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pnlForm.control}
                  name="pnl_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>P&L Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={pnlForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Strategy, mistakes, learnings..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={addPnL.isPending || updatePnL.isPending}>
                {editingPnl ? "Update Entry" : "Save Entry"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trading;
