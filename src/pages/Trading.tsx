import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarIcon, Pencil, Trash2, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTradingAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useDailyPnL, useCreatePnLEntry } from "@/hooks/useTrading";
import { useLogAction } from "@/hooks/useAuditLog";

const formatCurrency = (n: number) => "₹" + n.toLocaleString("en-IN");

const Trading = () => {
  const [activeTab, setActiveTab] = useState<"accounts" | "pnl" | "analytics">("accounts");
  const navigate = useNavigate();
  const [accOpen, setAccOpen] = useState(false);
  const [pnlOpen, setPnlOpen] = useState(false);
  const [pnlDate, setPnlDate] = useState<Date>();
  const [accForm, setAccForm] = useState({ name: "", broker: "", capital_allocated: "" });
  const [pnlForm, setPnlForm] = useState({ account_id: "", index_name: "NIFTY", custom_index: "", pnl_amount: "", capital_used: "", notes: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", broker: "", capital_allocated: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: accounts, isLoading: accLoading } = useTradingAccounts();
  const { data: pnlData, isLoading: pnlLoading } = useDailyPnL();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const createPnL = useCreatePnLEntry();
  const logAction = useLogAction();

  const pnl = pnlData || [];
  const totalPnL = pnl.reduce((s, e) => s + Number(e.pnl_amount), 0);
  const wins = pnl.filter((e) => Number(e.pnl_amount) > 0).length;
  const winRate = pnl.length > 0 ? ((wins / pnl.length) * 100).toFixed(1) : "0";

  // Build equity curve
  let equity = 2000000;
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

  const handleCreateAccount = async () => {
    if (!accForm.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      await createAccount.mutateAsync({ name: accForm.name, broker: accForm.broker || undefined, capital_allocated: accForm.capital_allocated ? Number(accForm.capital_allocated) : undefined });
      logAction.mutate({ action: "Created Account", referenceId: accForm.name, module: "Trading", notes: `${accForm.name} account added` });
      toast({ title: "Account created" });
      setAccForm({ name: "", broker: "", capital_allocated: "" });
      setAccOpen(false);
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleCreatePnL = async () => {
    if (!pnlForm.account_id || !pnlDate) { toast({ title: "Account & date required", variant: "destructive" }); return; }
    const resolvedIndex = pnlForm.index_name === "OTHER" ? (pnlForm.custom_index.trim() || "OTHER") : pnlForm.index_name;
    try {
      const dateStr = format(pnlDate, "yyyy-MM-dd");
      await createPnL.mutateAsync({
        account_id: pnlForm.account_id,
        date: dateStr,
        index_name: resolvedIndex,
        pnl_amount: Number(pnlForm.pnl_amount) || 0,
        capital_used: Number(pnlForm.capital_used) || 0,
        notes: pnlForm.notes,
      });
      logAction.mutate({ action: "Added Daily P&L", referenceId: pnlForm.account_id, module: "Trading", notes: `${resolvedIndex} ₹${pnlForm.pnl_amount}` });
      toast({ title: "P&L entry added" });
      setPnlForm({ account_id: "", index_name: "NIFTY", custom_index: "", pnl_amount: "", capital_used: "", notes: "" });
      setPnlDate(undefined);
      setPnlOpen(false);
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleEditAccount = async () => {
    if (!editForm.name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      await updateAccount.mutateAsync({ id: editForm.id, name: editForm.name, broker: editForm.broker || undefined, capital_allocated: editForm.capital_allocated ? Number(editForm.capital_allocated) : undefined });
      logAction.mutate({ action: "Updated Account", referenceId: editForm.name, module: "Trading", notes: `${editForm.name} updated` });
      toast({ title: "Account updated" });
      setEditOpen(false);
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDeleteAccount = async () => {
    if (!deleteId) return;
    try {
      await deleteAccount.mutateAsync(deleteId);
      logAction.mutate({ action: "Deleted Account", referenceId: deleteId, module: "Trading", notes: "Account removed" });
      toast({ title: "Account deleted" });
      setDeleteId(null);
    } catch { toast({ title: "Error deleting account", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div><h1 className="text-xl sm:text-2xl font-bold text-foreground">Trading</h1><p className="text-xs sm:text-sm text-muted-foreground">Accounts, P&L tracking & analytics</p></div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
        {(["accounts", "pnl", "analytics"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium capitalize transition-all whitespace-nowrap ${activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === "pnl" ? "Daily P&L" : tab}
          </button>
        ))}
      </div>

      {activeTab === "accounts" && (
        <div className="space-y-4">
          <Dialog open={accOpen} onOpenChange={setAccOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add Account</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Create Trading Account</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Account Name</Label><Input value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} placeholder="e.g. Alpha Strategy" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Broker</Label><Input value={accForm.broker} onChange={(e) => setAccForm({ ...accForm, broker: e.target.value })} placeholder="e.g. Zerodha" /></div>
                  <div className="grid gap-2"><Label>Capital Allocated</Label><Input value={accForm.capital_allocated} onChange={(e) => setAccForm({ ...accForm, capital_allocated: e.target.value })} type="number" placeholder="2000000" /></div>
                </div>
                <Button className="mt-2 w-full" onClick={handleCreateAccount} disabled={createAccount.isPending}>{createAccount.isPending ? "Creating..." : "Create Account"}</Button>
              </div>
            </DialogContent>
          </Dialog>

          {accLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {(accounts || []).map((acc) => {
                const accPnL = pnl.filter((e) => e.account_id === acc.id).reduce((s, e) => s + Number(e.pnl_amount), 0);
                const currentEquity = Number(acc.capital_allocated) + accPnL;
                return (
                <div key={acc.id} className="glass-card p-4 sm:p-5 space-y-2 sm:space-y-3 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all active:scale-[0.98]" onClick={() => navigate(`/trading/${acc.id}`)}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{acc.name}</h3>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${acc.status === "active" ? "bg-profit/15 text-profit border-profit/30" : "bg-muted text-muted-foreground border-border"}`}>{acc.status}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditForm({ id: acc.id, name: acc.name, broker: acc.broker || "", capital_allocated: String(acc.capital_allocated || "") }); setEditOpen(true); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(acc.id); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Broker: {acc.broker}</p>
                  <p className="font-mono text-base sm:text-lg font-bold text-foreground">{formatCurrency(currentEquity)}</p>
                  <p className={`text-xs font-mono ${accPnL >= 0 ? "text-profit" : "text-loss"}`}>{accPnL >= 0 ? "+" : ""}{formatCurrency(accPnL)} P&L</p>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "pnl" && (
        <div className="space-y-4">
          <Dialog open={pnlOpen} onOpenChange={setPnlOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add P&L Entry</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Add Daily P&L</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Account</Label>
                  <Select value={pnlForm.account_id} onValueChange={(v) => setPnlForm({ ...pnlForm, account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{(accounts || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !pnlDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pnlDate ? format(pnlDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={pnlDate} onSelect={setPnlDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label>Index</Label>
                    <Select value={pnlForm.index_name} onValueChange={(v) => setPnlForm({ ...pnlForm, index_name: v, custom_index: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIFTY">NIFTY</SelectItem>
                        <SelectItem value="BANKNIFTY">BANKNIFTY</SelectItem>
                        <SelectItem value="OTHER">OTHER</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {pnlForm.index_name === "OTHER" && (
                  <div className="grid gap-2">
                    <Label>Custom Index Name</Label>
                    <Input value={pnlForm.custom_index} onChange={(e) => setPnlForm({ ...pnlForm, custom_index: e.target.value })} placeholder="e.g. FINNIFTY, SENSEX" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>P&L Amount (₹)</Label><Input value={pnlForm.pnl_amount} onChange={(e) => setPnlForm({ ...pnlForm, pnl_amount: e.target.value })} type="number" placeholder="12500" /></div>
                  <div className="grid gap-2"><Label>Capital Used (₹)</Label><Input value={pnlForm.capital_used} onChange={(e) => setPnlForm({ ...pnlForm, capital_used: e.target.value })} type="number" placeholder="500000" /></div>
                </div>
                <div className="grid gap-2"><Label>Notes</Label><Input value={pnlForm.notes} onChange={(e) => setPnlForm({ ...pnlForm, notes: e.target.value })} placeholder="Optional notes" /></div>
                <Button className="mt-2 w-full" onClick={handleCreatePnL} disabled={createPnL.isPending}>{createPnL.isPending ? "Saving..." : "Save Entry"}</Button>
              </div>
            </DialogContent>
          </Dialog>

          {pnlLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <div className="glass-card overflow-hidden table-responsive">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 sm:px-5 py-3">Date</th><th className="px-4 sm:px-5 py-3">Index</th><th className="px-4 sm:px-5 py-3">P&L</th><th className="px-4 sm:px-5 py-3">P&L %</th><th className="px-4 sm:px-5 py-3">Capital</th>
                  </tr>
                </thead>
                <tbody>
                  {pnl.slice(0, 10).map((entry) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="glass-card p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground">Net Profit</p><p className={`font-mono text-base sm:text-xl font-bold ${totalPnL >= 0 ? "text-profit" : "text-loss"}`}>{formatCurrency(totalPnL)}</p></div>
            <div className="glass-card p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground">Win Rate</p><p className="font-mono text-base sm:text-xl font-bold text-foreground">{winRate}%</p></div>
            <div className="glass-card p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground">Total Trades</p><p className="font-mono text-base sm:text-xl font-bold text-foreground">{pnl.length}</p></div>
            <div className="glass-card p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground">Avg Daily P&L</p><p className={`font-mono text-base sm:text-xl font-bold ${pnl.length > 0 && totalPnL / pnl.length >= 0 ? "text-profit" : "text-loss"}`}>{pnl.length > 0 ? formatCurrency(Math.round(totalPnL / pnl.length)) : "₹0"}</p></div>
          </div>
          <div className="glass-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Equity Curve</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={equityCurve}>
                <defs><linearGradient id="eqGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(160,84%,39%)" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(160,84%,39%)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215,12%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215,12%,50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px", fontSize: 12, color: "hsl(210,20%,92%)" }} />
                <Area type="monotone" dataKey="equity" stroke="hsl(160,84%,39%)" strokeWidth={2} fill="url(#eqGrad2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Daily P&L Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215,12%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(215,12%,50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,16%)", borderRadius: "8px", fontSize: 12, color: "hsl(210,20%,92%)" }} />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Edit Account Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Trading Account</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Account Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Broker</Label><Input value={editForm.broker} onChange={(e) => setEditForm({ ...editForm, broker: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Capital Allocated</Label><Input value={editForm.capital_allocated} onChange={(e) => setEditForm({ ...editForm, capital_allocated: e.target.value })} type="number" /></div>
            </div>
            <Button className="mt-2 w-full" onClick={handleEditAccount} disabled={updateAccount.isPending}>{updateAccount.isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trading Account?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All P&L entries linked to this account will remain but the account will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Trading;
