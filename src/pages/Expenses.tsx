import { useState } from "react";
import { Plus, Trash2, Receipt, Pencil, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpenses, useCreateExpense, useDeleteExpense, useUpdateExpense } from "@/hooks/useExpenses";
import { toast } from "@/hooks/use-toast";

const formatCurrency = (n: number) => "₹" + n.toLocaleString("en-IN");

// Move DatePickerField outside component to prevent re-mounts
const DatePickerField = ({ date, onSelect }: { date: Date | undefined; onSelect: (d: Date | undefined) => void }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, "PPP") : <span>Pick a date</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0 z-50" align="start">
      <Calendar
        mode="single"
        selected={date}
        onSelect={onSelect}
        initialFocus
        className={cn("p-3 pointer-events-auto")}
      />
    </PopoverContent>
  </Popover>
);

const Expenses = () => {
  const { data: expenses, isLoading } = useExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const updateExpense = useUpdateExpense();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Split form state for Create vs Edit to avoid stale data leakage
  const [createForm, setCreateForm] = useState({ amount: "", date: new Date(), notes: "" });
  const [editForm, setEditForm] = useState({ amount: "", date: new Date(), notes: "" });

  const resetCreateForm = () => setCreateForm({ amount: "", date: new Date(), notes: "" });
  const resetEditForm = () => setEditForm({ amount: "", date: new Date(), notes: "" });

  const handleCreateSubmit = () => {
    const amount = parseFloat(createForm.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if ((createForm.notes || "").length > 500) {
      toast({ title: "Notes are too long (max 500 characters)", variant: "destructive" });
      return;
    }

    createExpense.mutate(
      { amount, date: format(createForm.date, "yyyy-MM-dd"), notes: createForm.notes },
      {
        onSuccess: () => {
          toast({ title: "Expense added" });
          resetCreateForm();
          setOpen(false);
        },
      }
    );
  };

  const handleEditOpen = (e: any) => {
    setEditId(e.id);
    // Correct timezone parsing: ensure YYYY-MM-DD is parsed as local midnight, not UTC
    setEditForm({
      amount: String(e.amount),
      date: new Date(e.date + "T00:00:00"),
      notes: e.notes || ""
    });
    setEditOpen(true);
  };

  const handleUpdateSubmit = () => {
    if (!editId) return;
    const amount = parseFloat(editForm.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if ((editForm.notes || "").length > 500) {
      toast({ title: "Notes are too long (max 500 characters)", variant: "destructive" });
      return;
    }

    updateExpense.mutate(
      { id: editId, amount, date: format(editForm.date, "yyyy-MM-dd"), notes: editForm.notes },
      {
        onSuccess: () => {
          toast({ title: "Expense updated" });
          resetEditForm();
          setEditOpen(false);
          setEditId(null);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteExpense.mutate(id, {
      onSuccess: () => toast({ title: "Expense deleted" }),
    });
  };

  const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track and manage all expenses</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetCreateForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 self-start sm:self-auto">
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Expense Amount (₹)</label>
                <Input type="number" placeholder="0" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <DatePickerField date={createForm.date} onSelect={(d) => d && setCreateForm({ ...createForm, date: d })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea
                  placeholder="Optional notes..."
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground text-right">{createForm.notes.length}/500</p>
              </div>
              <Button className="w-full" onClick={handleCreateSubmit} disabled={createExpense.isPending}>
                {createExpense.isPending ? "Saving..." : "Save Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog - Separate from Create Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { resetEditForm(); setEditId(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expense Amount (₹)</label>
              <Input type="number" placeholder="0" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <DatePickerField date={editForm.date} onSelect={(d) => d && setEditForm({ ...editForm, date: d })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                placeholder="Optional notes..."
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                maxLength={500}
              />
              <p className="text-[10px] text-muted-foreground text-right">{editForm.notes.length}/500</p>
            </div>
            <Button className="w-full" onClick={handleUpdateSubmit} disabled={updateExpense.isPending}>
              {updateExpense.isPending ? "Updating..." : "Update Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Expenses</p>
            <p className="font-mono text-xl sm:text-2xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="hidden sm:table-cell px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground w-24"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-6" /></td></tr>
                ))
              ) : (expenses || []).length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-xs">No expenses recorded yet.</td></tr>
              ) : (
                (expenses || []).map((e) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{new Date(e.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-loss">{formatCurrency(Number(e.amount))}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">{e.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEditOpen(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-loss">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(e.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
