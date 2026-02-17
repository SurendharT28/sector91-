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

const Expenses = () => {
  const { data: expenses, isLoading } = useExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const updateExpense = useUpdateExpense();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ amount: "", date: new Date(), notes: "" });

  const resetForm = () => setForm({ amount: "", date: new Date(), notes: "" });

  const handleSubmit = () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    createExpense.mutate(
      { amount, date: format(form.date, "yyyy-MM-dd"), notes: form.notes },
      {
        onSuccess: () => {
          toast({ title: "Expense added" });
          resetForm();
          setOpen(false);
        },
      }
    );
  };

  const handleEdit = (e: any) => {
    setEditId(e.id);
    setForm({ amount: String(e.amount), date: new Date(e.date + "T00:00:00"), notes: e.notes || "" });
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editId) return;
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    updateExpense.mutate(
      { id: editId, amount, date: format(form.date, "yyyy-MM-dd"), notes: form.notes },
      {
        onSuccess: () => {
          toast({ title: "Expense updated" });
          resetForm();
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

  const DatePickerField = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.date && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {form.date ? format(form.date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <Calendar
          mode="single"
          selected={form.date}
          onSelect={(d) => d && setForm({ ...form, date: d })}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track and manage all expenses</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
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
                <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <DatePickerField />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={createExpense.isPending}>
                {createExpense.isPending ? "Saving..." : "Save Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { resetForm(); setEditId(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expense Amount (₹)</label>
              <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <DatePickerField />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
            <Button className="w-full" onClick={handleUpdate} disabled={updateExpense.isPending}>
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
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-loss">{formatCurrency(Number(e.amount))}</td>
                    <td className="hidden sm:table-cell px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">{e.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEdit(e)}>
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
