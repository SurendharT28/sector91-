import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Clock, UserCheck, UserX, Eye, CheckCircle, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useInvestors, useCreateInvestor, useUpdateInvestorStatus, useUpdateInvestor, useDeleteInvestor } from "@/hooks/useInvestors";
import { useWaitingPeriodEntries, useMarkDelivered, useAddWaitingPeriodEntry } from "@/hooks/useInvestorDetails";
import { useLogAction } from "@/hooks/useAuditLog";
import { investorSchema, waitingPeriodSchema, type InvestorFormValues, type WaitingPeriodFormValues } from "@/schemas/investorSchema";

const formatCurrency = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtLong = (d: Date) => d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  active: { label: "Active", className: "bg-profit/15 text-profit border-profit/30", icon: <UserCheck className="h-3 w-3" /> },
  waiting_period: { label: "Waiting Period", className: "bg-warning/15 text-warning border-warning/30", icon: <Clock className="h-3 w-3" /> },
  inactive: { label: "Inactive", className: "bg-loss/15 text-loss border-loss/30", icon: <UserX className="h-3 w-3" /> },
};

const Investors = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [moveWaitingId, setMoveWaitingId] = useState<{ id: string; name: string } | null>(null);

  const { toast } = useToast();
  const { data: investors, isLoading } = useInvestors();
  const createInvestor = useCreateInvestor();
  const updateStatus = useUpdateInvestorStatus();
  const updateInvestor = useUpdateInvestor();
  const deleteInvestor = useDeleteInvestor();
  const logAction = useLogAction();

  // All waiting period entries across all investors
  const { data: waitingEntries = [] } = useWaitingPeriodEntries();
  const markDelivered = useMarkDelivered();
  const addWaitingEntry = useAddWaitingPeriodEntry();

  // Forms
  const createForm = useForm<InvestorFormValues>({
    resolver: zodResolver(investorSchema),
    defaultValues: { full_name: "", email: "", phone: "", address: "" },
  });

  const editForm = useForm<InvestorFormValues>({
    resolver: zodResolver(investorSchema),
    defaultValues: { full_name: "", email: "", phone: "", address: "" },
  });

  const waitingForm = useForm<WaitingPeriodFormValues>({
    resolver: zodResolver(waitingPeriodSchema),
    defaultValues: { amount: 0 },
  });

  const filtered = (investors || []).filter((inv) =>
    inv.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const activeInvestors = filtered.filter((inv) => inv.status === "active");
  const waitingInvestors = filtered.filter((inv) => inv.status === "waiting_period");
  const inactiveInvestors = filtered.filter((inv) => inv.status === "inactive");

  // Separate entries: delivered = manually marked OR 60+ days old; pending = neither
  const now = new Date();
  const pendingWaitingEntries = waitingEntries.filter((e) => {
    if (e.delivered) return false;
    const diffDays = (now.getTime() - new Date(e.initialized_date).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < 60;
  });
  const deliveredEntries = waitingEntries.filter((e) => {
    if (e.delivered) return true;
    const diffDays = (now.getTime() - new Date(e.initialized_date).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 60;
  });

  /**
   * Manually move a waiting period entry to Delivered Amounts.
   * Overrides the 60-day timer, updates DB immediately, logs the action.
   */
  const handleManualDeliver = async (entryId: string, investorName: string, clientId: string, amount: number) => {
    try {
      await markDelivered.mutateAsync({ id: entryId });
      logAction.mutate({
        action: "Waiting Period moved to Delivered Amounts manually",
        referenceId: clientId,
        module: "Investors",
        notes: `${investorName}: ${formatCurrency(amount)} manually moved to Delivered Amounts`,
      });
      toast({ title: "Moved to Delivered Amounts", description: `${formatCurrency(amount)} for ${investorName}` });
    } catch {
      toast({ title: "Error moving to delivered", variant: "destructive" });
    }
  };

  const onCreateSubmit = async (data: InvestorFormValues) => {
    try {
      const result = await createInvestor.mutateAsync({
        full_name: data.full_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        joining_date: new Date().toISOString().split("T")[0],
      });
      logAction.mutate({ action: "Created Investor", referenceId: result.client_id || "", module: "Investors", notes: `${data.full_name} onboarded` });
      toast({ title: "Investor created", description: `Client ID: ${result.client_id}` });
      createForm.reset();
      setOpen(false);
    } catch {
      toast({ title: "Error creating investor", variant: "destructive" });
    }
  };

  const onWaitingSubmit = async (data: WaitingPeriodFormValues) => {
    if (!moveWaitingId) return;
    try {
      // 1. Create Waiting Period Entry
      await addWaitingEntry.mutateAsync({
        investor_id: moveWaitingId.id,
        amount: data.amount,
        initialized_date: new Date().toISOString(),
      });
      // 2. Update Status
      await updateStatus.mutateAsync({ id: moveWaitingId.id, status: "waiting_period" });

      logAction.mutate({
        action: "Moved to Waiting Period",
        referenceId: moveWaitingId.id,
        module: "Investors",
        notes: `${moveWaitingId.name} moved to Waiting Period with ₹${data.amount}`
      });

      toast({ title: "Moved to Waiting Period", description: `Added entry for ₹${data.amount}` });
      setMoveWaitingId(null);
      waitingForm.reset();
    } catch {
      toast({ title: "Error moving to waiting period", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, name: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      const statusLabel = statusConfig[newStatus]?.label || newStatus;
      logAction.mutate({ action: `Status changed to ${statusLabel}`, referenceId: id, module: "Investors", notes: `${name} moved to ${statusLabel}` });
      toast({ title: "Status updated", description: `${name} is now ${statusLabel}` });
    } catch {
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleEditOpen = (inv: typeof filtered[0]) => {
    setEditId(inv.id);
    editForm.reset({
      full_name: inv.full_name,
      email: inv.email || "",
      phone: inv.phone || "",
      address: inv.address || ""
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (data: InvestorFormValues) => {
    if (!editId) return;
    try {
      await updateInvestor.mutateAsync({
        id: editId,
        full_name: data.full_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined
      });
      logAction.mutate({ action: "Investor Updated", referenceId: editId, module: "Investors", notes: `${data.full_name} details updated` });
      toast({ title: "Investor updated" });
      setEditOpen(false);
    } catch {
      toast({ title: "Error updating investor", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteInvestor.mutateAsync(deleteConfirm.id);
      logAction.mutate({ action: "Investor Deleted", referenceId: deleteConfirm.id, module: "Investors", notes: `${deleteConfirm.name} and all related records deleted` });
      toast({ title: "Investor deleted", description: `${deleteConfirm.name} has been removed` });
      setDeleteConfirm(null);
    } catch {
      toast({ title: "Error deleting investor", variant: "destructive" });
    }
  };

  const renderTable = (data: typeof filtered) => (
    <div className="glass-card overflow-hidden">
      {isLoading ? (
        <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-sm">No investors found</div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden divide-y divide-border/50">
            {data.map((inv) => {
              const status = inv.status || "active";
              const cfg = statusConfig[status] || statusConfig.active;
              return (
                <div key={inv.id} className="p-4 active:bg-muted/30" onClick={() => navigate(`/investors/${inv.id}`)}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">{inv.full_name}</p>
                    <Badge variant="outline" className={`gap-1 text-[10px] font-medium uppercase ${cfg.className}`}>
                      {cfg.icon} {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs text-primary">{inv.client_id}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {inv.joining_date ? new Date(inv.joining_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop table view */}
          <div className="hidden sm:block table-responsive">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Client ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((inv) => {
                  const status = inv.status || "active";
                  const cfg = statusConfig[status] || statusConfig.active;
                  return (
                    <tr key={inv.id} className="border-b border-border/50 transition-colors hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/investors/${inv.id}`)}>
                      <td className="px-5 py-4 font-mono text-xs text-primary">{inv.client_id}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-foreground">{inv.full_name}</p>
                        <p className="text-xs text-muted-foreground">{inv.email}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {inv.joining_date ? new Date(inv.joining_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={`gap-1 text-[10px] font-medium uppercase ${cfg.className}`}>
                          {cfg.icon} {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/investors/${inv.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {status !== "active" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(inv.id, inv.full_name, "active")}>
                                  <UserCheck className="mr-2 h-4 w-4 text-profit" /> Set Active
                                </DropdownMenuItem>
                              )}
                              {status !== "waiting_period" && (
                                <DropdownMenuItem onClick={() => { setMoveWaitingId({ id: inv.id, name: inv.full_name }); waitingForm.reset(); }}>
                                  <Clock className="mr-2 h-4 w-4 text-warning" /> Move to Waiting Period
                                </DropdownMenuItem>
                              )}
                              {status !== "inactive" && (
                                <DropdownMenuItem onClick={() => handleStatusChange(inv.id, inv.full_name, "inactive")}>
                                  <UserX className="mr-2 h-4 w-4 text-loss" /> Set Inactive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditOpen(inv)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-loss" onClick={() => setDeleteConfirm({ id: inv.id, name: inv.full_name })}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Investor
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  const renderWaitingEntries = (entries: typeof waitingEntries, isDelivered: boolean) => (
    <div className="glass-card overflow-hidden">
      {entries.length === 0 ? (
        <div className="p-8 sm:p-12 text-center text-muted-foreground text-sm">
          {isDelivered ? "No delivered amounts yet" : "No waiting period entries"}
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="sm:hidden divide-y divide-border/50">
            {entries.map((entry) => {
              const inv = (investors || []).find((i) => i.id === entry.investor_id);
              const initDate = new Date(entry.initialized_date);
              const endDate = new Date(initDate);
              endDate.setDate(endDate.getDate() + 60);
              return (
                <div key={entry.id} className="p-4 space-y-2 active:bg-muted/30" onClick={() => inv && navigate(`/investors/${inv.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{inv?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{inv?.client_id}</p>
                    </div>
                    <span className="font-mono text-sm font-bold text-foreground">{formatCurrency(Number(entry.amount))}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{fmtLong(initDate)}</span>
                    <span className={isDelivered ? "text-profit" : "text-warning"}>{fmtLong(endDate)}</span>
                  </div>
                  {!isDelivered && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs w-full mt-1"
                      disabled={markDelivered.isPending}
                      onClick={(e) => { e.stopPropagation(); handleManualDeliver(entry.id, inv?.full_name || "Unknown", inv?.client_id || "", Number(entry.amount)); }}
                    >
                      <CheckCircle className="h-3 w-3" /> Move to Delivered
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Investor</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Initialized Date</th>
                  <th className="px-5 py-3">{isDelivered ? "Delivered Date" : "Waiting Period Ends"}</th>
                  {!isDelivered && <th className="px-5 py-3">Action</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const inv = (investors || []).find((i) => i.id === entry.investor_id);
                  const initDate = new Date(entry.initialized_date);
                  const endDate = new Date(initDate);
                  endDate.setDate(endDate.getDate() + 60);
                  return (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => inv && navigate(`/investors/${inv.id}`)}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-foreground">{inv?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{inv?.client_id}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-foreground">{formatCurrency(Number(entry.amount))}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{fmtLong(initDate)}</td>
                      <td className={`px-5 py-4 text-sm ${isDelivered ? "text-profit" : "text-warning"}`}>{fmtLong(endDate)}</td>
                      {!isDelivered && (
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            disabled={markDelivered.isPending}
                            onClick={() => handleManualDeliver(entry.id, inv?.full_name || "Unknown", inv?.client_id || "", Number(entry.amount))}
                          >
                            <CheckCircle className="h-3 w-3" /> Move to Delivered
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Investors</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage investor relationships & capital</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 self-start sm:self-auto"><Plus className="h-4 w-4" />Add Investor</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle>Add New Investor</DialogTitle></DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="grid gap-4 py-4">
                <FormField
                  control={createForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 XXXXX XXXXX" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="City, State" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="mt-2 w-full" disabled={createInvestor.isPending}>
                  {createInvestor.isPending ? "Creating..." : "Create Investor"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search investors..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs defaultValue="active" className="tabs-scrollable space-y-4">
        <TabsList className="bg-muted w-full sm:w-auto">
          <TabsTrigger value="active" className="gap-1.5 text-xs sm:text-sm"><UserCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Active ({activeInvestors.length})</TabsTrigger>
          <TabsTrigger value="waiting" className="gap-1.5 text-xs sm:text-sm"><Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Waiting ({pendingWaitingEntries.length})</TabsTrigger>
          <TabsTrigger value="inactive" className="gap-1.5 text-xs sm:text-sm"><UserX className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Inactive ({inactiveInvestors.length})</TabsTrigger>
          <TabsTrigger value="delivered" className="gap-1.5 text-xs sm:text-sm"><CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Delivered ({deliveredEntries.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">{renderTable(activeInvestors)}</TabsContent>
        <TabsContent value="waiting">{renderWaitingEntries(pendingWaitingEntries, false)}</TabsContent>
        <TabsContent value="inactive">{renderTable(inactiveInvestors)}</TabsContent>
        <TabsContent value="delivered">{renderWaitingEntries(deliveredEntries, true)}</TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Investor</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="grid gap-4 py-4">
              <FormField
                control={editForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 XXXXX XXXXX" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="City, State" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="mt-2 w-full" disabled={updateInvestor.isPending}>
                {updateInvestor.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveWaitingId} onOpenChange={(open) => !open && setMoveWaitingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Move to Waiting Period</DialogTitle></DialogHeader>
          <Form {...waitingForm}>
            <form onSubmit={waitingForm.handleSubmit(onWaitingSubmit)} className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                This will change the investor's status to <strong>Waiting Period</strong> and create a tracking entry.
                Please confirm the amount to be eventually delivered.
              </p>
              <FormField
                control={waitingForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter amount" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={updateStatus.isPending || addWaitingEntry.isPending}
              >
                {(updateStatus.isPending || addWaitingEntry.isPending) ? "Moving..." : "Confirm Move"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This will permanently remove the investor and all related records (investments, returns, agreements, waiting period entries). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteInvestor.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Investors;
