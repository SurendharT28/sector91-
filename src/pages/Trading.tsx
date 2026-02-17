import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarIcon, Pencil, Trash2, MoreVertical, X } from "lucide-react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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

const Trading = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pnlDialogOpen, setPnlDialogOpen] = useState(false);
  const [editingPnl, setEditingPnl] = useState<any>(null); // For PnL Edit Mode
  const [editingAccount, setEditingAccount] = useState<any>(null); // For Account Edit Mode

  // Forms
  const accountForm = useForm<TradingAccountFormValues>({
    resolver: zodResolver(tradingAccountSchema),
    defaultValues: { name: "", broker: "", capital_allocated: 0 },
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

  // Chart Data preparation
  const chartData = [...filteredPnL]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(p => ({
      date: format(new Date(p.date), "dd MMM"),
      pnl: Number(p.pnl_amount),
      capital: Number(p.capital_used),
    }));

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
      // Ensure date is in local YYYY-MM-DD format to avoid UTC shifts
      const formattedDate = format(data.date, "yyyy-MM-dd");

      const payload = {
        ...data,
        date: formattedDate,
      };

      if (editingPnl) {
        await updatePnL.mutateAsync({ id: editingPnl.id, ...payload });
        logAction.mutate({ action: "Updated PnL Log", referenceId: editingPnl.id, module: "Trading", notes: `${data.date.toDateString()} PnL updated` });
        toast({ title: "PnL entry updated" });
      } else {
        const res = await addPnL.mutateAsync(payload);
        logAction.mutate({ action: "Added PnL Log", referenceId: res.id, module: "Trading", notes: `${data.date.toDateString()} PnL added` });
        toast({ title: "PnL entry added" });
      }
      setPnlDialogOpen(false);
      setEditingPnl(null);
      pnlForm.reset({
        account_id: selectedAccount === "all" ? "" : selectedAccount,
        date: new Date(),
        index_name: "NIFTY",
        pnl_amount: 0,
        capital_used: 0,
        notes: "",
      });
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
    // Basic check, ideally checking if PnL exists
    if (confirm(`Are you sure you want to delete ${name}? This will delete all associated PnL data.`)) {
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
      date: new Date(pnl.date),
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
    });
    setAccountDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trading Journal</h1>
          <p className="text-muted-foreground">Track daily performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Account" />
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
          <Button onClick={() => { setAccountDialogOpen(true); setEditingAccount(null); accountForm.reset(); }}>
            <Plus className="h-4 w-4 mr-2" /> Account
          </Button>
          <Button onClick={() => { setPnlDialogOpen(true); setEditingPnl(null); pnlForm.reset({ account_id: selectedAccount === "all" ? "" : selectedAccount, date: new Date(), index_name: "NIFTY", pnl_amount: 0, capital_used: 0, notes: "" }); }}>
            <Plus className="h-4 w-4 mr-2" /> Entry
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Total P&L</p>
          <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-profit" : "text-loss"}`}>
            {formatCurrency(totalPnL)}
          </div>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
          <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Trades</p>
          <div className="text-2xl font-bold">{filteredPnL.length}</div>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm font-medium text-muted-foreground">Account Capital</p>
          <div className="text-2xl font-bold">
            {selectedAccount === "all"
              ? formatCurrency(accounts?.reduce((sum, acc) => sum + Number(acc.capital_allocated), 0) || 0)
              : formatCurrency(Number(accounts?.find(a => a.id === selectedAccount)?.capital_allocated || 0))
            }
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-6 h-[300px]">
          <h3 className="text-lg font-semibold mb-4">P&L Curve</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area type="monotone" dataKey="pnl" stroke="#10b981" fillOpacity={1} fill="url(#colorPnL)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-6 h-[300px]">
          <h3 className="text-lg font-semibold mb-4">Capital Usage</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="capital" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold">Recent Activity</h3>
        </div>
        <div className="table-responsive">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Instrument</th>
                <th className="px-5 py-3 text-right">Capital</th>
                <th className="px-5 py-3 text-right">P&L</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPnL.map((pnl) => {
                const isProfit = Number(pnl.pnl_amount) >= 0;
                const accountName = accounts?.find(a => a.id === pnl.account_id)?.name || "Unknown";
                return (
                  <tr key={pnl.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-5 py-4 text-sm">{format(new Date(pnl.date), "dd MMM yyyy")}</td>
                    <td className="px-5 py-4 text-sm">{accountName}</td>
                    <td className="px-5 py-4">
                      <Badge variant="outline">{pnl.index_name}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-right font-mono">{formatCurrency(Number(pnl.capital_used))}</td>
                    <td className={`px-5 py-4 text-sm text-right font-bold ${isProfit ? "text-profit" : "text-loss"}`}>
                      {formatCurrency(Number(pnl.pnl_amount))}
                    </td>
                    <td className="px-5 py-4 text-right">
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
                          <DropdownMenuItem onClick={() => handleDeletePnL(pnl.id, pnl.date)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
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
              <Button type="submit" className="w-full" disabled={createAccount.isPending || updateAccount.isPending}>
                {editingAccount ? "Update Account" : "Create Account"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* PnL Dialog */}
      <Dialog open={pnlDialogOpen} onOpenChange={setPnlDialogOpen}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                        <Input placeholder="If Other..." {...field} disabled={pnlForm.watch("index_name") !== "OTHER"} />
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
