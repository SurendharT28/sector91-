import { useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, IndianRupee, Percent, Calendar, TrendingUp, TrendingDown, Wallet, Clock, CheckCircle, Pencil, Trash2, Upload, FileText, ExternalLink, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useInvestors, useUpdateInvestor, useDeleteInvestor } from "@/hooks/useInvestors";
import { useInvestments, useAddInvestment, useMonthlyReturns, useAddMonthlyReturn, useWaitingPeriodEntries, useAddWaitingPeriodEntry, useMarkDelivered } from "@/hooks/useInvestorDetails";
import { useAgreements, useUploadAgreement } from "@/hooks/useAgreements";
import { useLogAction } from "@/hooks/useAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { downloadInvestorReport } from "@/lib/reportUtils";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtMonth = (m: string) => {
  const [year, month] = m.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
const fmtLong = (d: Date) => d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const InvestorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const logAction = useLogAction();
  const { data: investors, isLoading: loadingInv } = useInvestors();
  const investor = investors?.find((i) => i.id === id);

  const { data: investments = [], isLoading: loadingInvestments } = useInvestments(id || "");
  const { data: returns = [], isLoading: loadingReturns } = useMonthlyReturns(id || "");
  // Waiting period entries serve as capital return records
  // Entries < 60 days old = in waiting period, entries >= 60 days = delivered (capital returned)
  const { data: waitingEntries = [] } = useWaitingPeriodEntries(id || "");
  const { data: allAgreements } = useAgreements();
  const investorAgreements = useMemo(() => (allAgreements || []).filter((a) => a.investor_id === id), [allAgreements, id]);
  const uploadAgreement = useUploadAgreement();
  const fileRef = useRef<HTMLInputElement>(null);

  const addInvestment = useAddInvestment();
  const addReturn = useAddMonthlyReturn();
  const updateInvestor = useUpdateInvestor();
  const deleteInvestor = useDeleteInvestor();
  // Initialize capital return = create a waiting period entry
  const addWaiting = useAddWaitingPeriodEntry();

  const [invOpen, setInvOpen] = useState(false);
  const [retOpen, setRetOpen] = useState(false);
  // Dialog for initializing a capital return (enters waiting period)
  const [initCapOpen, setInitCapOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Separate form state for each dialog to prevent data leakage
  const [invForm, setInvForm] = useState({ amount: "", invested_date: new Date().toISOString().split("T")[0], notes: "", promised_return: "" });
  const [retForm, setRetForm] = useState({ month: "", return_percent: "" });
  const [initCapForm, setInitCapForm] = useState({ amount: "", initialized_date: new Date().toISOString().split("T")[0] });
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "", address: "" });

  // Generate month options (last 24 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  }, []);

  if (loadingInv) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  if (!investor) return <div className="p-8 text-muted-foreground">Investor not found</div>;

  const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
  const totalReturned = returns.reduce((s, r) => s + Number(r.amount), 0);

  // Separate entries: delivered = manually marked OR 60+ days old; pending = neither
  const now = new Date();
  const deliveredEntries = waitingEntries.filter((e) => {
    if (e.delivered) return true;
    const diffDays = (now.getTime() - new Date(e.initialized_date).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 60;
  });
  const pendingEntries = waitingEntries.filter((e) => {
    if (e.delivered) return false;
    const diffDays = (now.getTime() - new Date(e.initialized_date).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays < 60;
  });

  // Capital returned = sum of delivered (matured) waiting period entries only
  const totalCapitalReturned = deliveredEntries.reduce((s, e) => s + Number(e.amount), 0);

  // Remaining Capital = Total Invested - Capital Returned (delivered amounts)
  // Guard against negative values
  const remainingCapital = Math.max(0, totalInvested - totalCapitalReturned);

  // --- Handlers ---

  const handleAddInvestment = async () => {
    if (!invForm.amount) { toast({ title: "Amount required", variant: "destructive" }); return; }
    if (Number(invForm.amount) <= 0) { toast({ title: "Amount must be positive", variant: "destructive" }); return; }

    try {
      await addInvestment.mutateAsync({ investor_id: investor.id, amount: Number(invForm.amount), invested_date: invForm.invested_date, notes: invForm.notes, promised_return: invForm.promised_return ? Number(invForm.promised_return) : undefined });
      logAction.mutate({ action: "Investment Added", referenceId: investor.client_id || "", module: "Investors", notes: `${fmt(Number(invForm.amount))} invested, promised ${invForm.promised_return}%` });
      toast({ title: "Investment recorded" });
      setInvForm({ amount: "", invested_date: new Date().toISOString().split("T")[0], notes: "", promised_return: "" });
      setInvOpen(false);
    } catch {
      toast({ title: "Failed to add investment", variant: "destructive" });
    }
  };

  const handleAddReturn = async () => {
    if (!retForm.month || !retForm.return_percent) { toast({ title: "Month & return % required", variant: "destructive" }); return; }
    // Auto-calculate amount based on percentage of remaining capital
    const calculatedAmount = Math.round(remainingCapital * (Number(retForm.return_percent) / 100));

    try {
      await addReturn.mutateAsync({ investor_id: investor.id, month: retForm.month, amount: calculatedAmount, return_percent: Number(retForm.return_percent) || 0 });
      logAction.mutate({ action: "Monthly Return Added", referenceId: investor.client_id || "", module: "Returns", notes: `${retForm.month}: ${fmt(calculatedAmount)} (${retForm.return_percent}%)` });
      toast({ title: "Return recorded", description: `${fmt(calculatedAmount)} (${retForm.return_percent}% of ${fmt(remainingCapital)})` });
      setRetForm({ month: "", return_percent: "" });
      setRetOpen(false);
    } catch {
      toast({ title: "Failed to add return", variant: "destructive" });
    }
  };

  /**
   * Initialize Capital Return:
   * - Creates a waiting_period_entry with investor_id, amount, and initialized_date.
   * - This entry will appear in the "Waiting Period" section on the Investors page for 60 days.
   * - After 60 days, it automatically moves to "Delivered Amounts" and updates capital returned.
   * - Validation: cannot exceed remaining capital.
   */
  const handleInitializeCapitalReturn = async () => {
    if (!initCapForm.amount) { toast({ title: "Amount required", variant: "destructive" }); return; }
    const capAmount = Number(initCapForm.amount);
    if (capAmount <= 0) { toast({ title: "Amount must be positive", variant: "destructive" }); return; }
    if (capAmount > remainingCapital) {
      toast({ title: "Amount exceeds remaining capital", description: `Max returnable: ${fmt(remainingCapital)}`, variant: "destructive" });
      return;
    }

    try {
      await addWaiting.mutateAsync({ investor_id: investor.id, amount: capAmount, initialized_date: initCapForm.initialized_date });
      logAction.mutate({ action: "Capital Return Initialized", referenceId: investor.client_id || "", module: "Investors", notes: `${fmt(capAmount)} capital return initialized, enters 60-day waiting period` });
      toast({ title: "Capital return initialized", description: "Will appear in Delivered Amounts after 60 days" });
      setInitCapForm({ amount: "", initialized_date: new Date().toISOString().split("T")[0] });
      setInitCapOpen(false);
    } catch {
      toast({ title: "Failed to initialize return", variant: "destructive" });
    }
  };

  const handleUploadAgreement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !investor) return;

    // Improved version logic: max + 1
    const maxVersion = investorAgreements.length > 0
      ? Math.max(...investorAgreements.map(a => a.version))
      : 0;
    const nextVersion = maxVersion + 1;
    try {
      await uploadAgreement.mutateAsync({ investorId: investor.id, file, version: nextVersion });
      logAction.mutate({ action: "Agreement Uploaded", referenceId: investor.client_id || "", module: "Agreements", notes: file.name });
      toast({ title: "Agreement uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const openAgreementFile = async (path: string) => {
    // Use createSignedUrl for private buckets
    const { data, error } = await supabase.storage.from("agreements").createSignedUrl(path, 60);
    if (error || !data) {
      toast({ title: "Failed to open file", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const generateAgreement = (inv: { amount: number; invested_date: string }) => {
    const agreementDate = fmtDate(inv.invested_date);
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Agreement - ${investor.full_name}</title>
<style>
@page { size: A4 portrait; margin: 20mm 25mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; padding: 40px; max-width: 210mm; margin: 0 auto; }
h1 { font-size: 18pt; text-align: center; letter-spacing: 4px; margin-bottom: 4px; }
h2 { font-size: 13pt; text-align: center; font-weight: normal; margin-bottom: 20px; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
.subtitle { text-align: center; font-size: 9pt; color: #555; margin-bottom: 24px; }
.section { margin-bottom: 14px; }
.section-title { font-size: 11pt; font-weight: bold; margin-bottom: 4px; }
.field { border-bottom: 1px solid #999; display: inline-block; min-width: 200px; padding: 2px 4px; }
.field.filled { color: #1a1a1a; font-weight: 600; }
.two-col { display: flex; justify-content: space-between; gap: 40px; margin-top: 30px; }
.sig-block { flex: 1; }
.sig-line { border-bottom: 1px solid #999; height: 40px; margin-bottom: 4px; }
.sig-label { font-size: 9pt; color: #555; }
p { margin-bottom: 6px; text-align: justify; }
ul { margin-left: 20px; margin-bottom: 6px; }
li { margin-bottom: 3px; }
@media print { body { padding: 0; } }
</style></head><body>
<h1>SECTOR 91 TRADING</h1>
<h2>INVESTMENT MANAGEMENT AGREEMENT</h2>
<p class="subtitle">(Client Onboarding — One-Page Premium Version)</p>

<div class="section"><strong>Agreement Date:</strong> <span class="field filled">${agreementDate}</span></div>

<div class="section">
<p>This Agreement is entered into between:</p>
<p><strong>Sector 91 Trading</strong> ("The Firm")<br/>Representative: <span class="field"></span></p>
<p>and</p>
<p><strong>Investor Name:</strong> <span class="field filled">${investor.full_name}</span><br/>
<strong>Contact:</strong> <span class="field filled">${investor.phone || '___________________'}</span></p>
</div>

<div class="section"><p class="section-title">1. Investment Mandate</p>
<p>The Investor appoints Sector 91 Trading to manage the allocated capital for professional trading and investment activities under the Firm's internal strategies and risk management framework.</p>
<p><strong>Initial Capital:</strong> <span class="field filled">${String.fromCharCode(8377)}${Number(inv.amount).toLocaleString('en-IN')}</span><br/>
<strong>Start Date:</strong> <span class="field filled">${agreementDate}</span></p></div>

<div class="section"><p class="section-title">2. Target Performance</p>
<p>The Firm aims to generate an estimated monthly return of 2% – 3% based on prevailing market conditions.</p>
<p>This represents a performance target only and shall not be interpreted as a fixed or guaranteed return.</p></div>

<div class="section"><p class="section-title">3. Risk Disclosure</p>
<p>The Investor acknowledges that:</p>
<ul>
<li>Trading in financial markets involves inherent risk.</li>
<li>Capital value may fluctuate.</li>
<li>Profits are not assured and losses may occur.</li>
<li>The Firm will operate with professional risk management but cannot eliminate market risk.</li>
</ul></div>

<div class="section"><p class="section-title">4. Profit Distribution &amp; Withdrawals</p>
<p>Performance is calculated on a monthly basis. Profit payouts and capital withdrawals are processed as per agreed timelines.</p>
<p>Investor withdrawal request notice: ______ days.</p></div>

<div class="section"><p class="section-title">5. Fees (If Applicable)</p>
<p>Performance Fee: ______ % &nbsp;&nbsp;&nbsp; Management Fee: ______ %</p></div>

<div class="section"><p class="section-title">6. Confidentiality &amp; Professional Conduct</p>
<p>Both parties agree to maintain strict confidentiality regarding trading strategies, performance data, and financial information.</p></div>

<div class="section"><p class="section-title">7. Termination</p>
<p>Either party may terminate this agreement with written notice. Final settlement will be completed after reconciliation of open positions and account balances.</p></div>

<div class="section"><p class="section-title">8. Governing Law</p>
<p>This Agreement shall be governed by the laws of: <span class="field"></span></p></div>

<div class="section"><p class="section-title">9. Declaration</p>
<p>By signing below, both parties confirm that they have read, understood, and voluntarily agree to the terms stated above.</p></div>

<p style="margin-top:16px;font-weight:bold;">Authorized Signatures</p>
<div class="two-col">
<div class="sig-block">
<p style="font-size:10pt;font-weight:bold;">For Sector 91 Trading</p>
<p style="font-size:9pt;">Name: <span class="field"></span></p>
<div class="sig-line"></div><p class="sig-label">Signature</p>
<p style="font-size:9pt;">Date: <span class="field"></span></p>
</div>
<div class="sig-block">
<p style="font-size:10pt;font-weight:bold;">Investor / Client</p>
<p style="font-size:9pt;">Name: <span class="field filled">${investor.full_name}</span></p>
<div class="sig-line"></div><p class="sig-label">Signature</p>
<p style="font-size:9pt;">Date: <span class="field filled">${agreementDate}</span></p>
</div>
</div>

<p style="margin-top:20px;font-weight:bold;">Witnesses</p>
<div class="two-col">
<div class="sig-block">
<p style="font-size:9pt;">Witness 1 Name: <span class="field"></span></p>
<div class="sig-line"></div><p class="sig-label">Signature</p>
</div>
<div class="sig-block">
<p style="font-size:9pt;">Witness 2 Name: <span class="field"></span></p>
<div class="sig-line"></div><p class="sig-label">Signature</p>
</div>
</div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleEditOpen = () => {
    setEditForm({ full_name: investor.full_name, email: investor.email || "", phone: investor.phone || "", address: investor.address || "" });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.full_name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      await updateInvestor.mutateAsync({ id: investor.id, full_name: editForm.full_name, email: editForm.email || undefined, phone: editForm.phone || undefined, address: editForm.address || undefined });
      logAction.mutate({ action: "Investor Updated", referenceId: investor.client_id || "", module: "Investors", notes: `${editForm.full_name} details updated` });
      toast({ title: "Investor updated" });
      setEditOpen(false);
    } catch {
      toast({ title: "Error updating investor", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteInvestor.mutateAsync(investor.id);
      logAction.mutate({ action: "Investor Deleted", referenceId: investor.client_id || "", module: "Investors", notes: `${investor.full_name} and all related records deleted` });
      toast({ title: "Investor deleted" });
      navigate("/investors");
    } catch {
      toast({ title: "Error deleting investor", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/investors")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{investor.full_name}</h1>
              <Badge variant="outline" className="font-mono text-[10px] sm:text-xs text-primary border-primary/30 shrink-0">{investor.client_id}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{investor.email} · {investor.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-11 sm:pl-0 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={() => downloadInvestorReport(investor, investments, returns, waitingEntries)}>
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden xs:inline">Download</span> Report
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={handleEditOpen}>
            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm text-destructive hover:text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <SummaryCard icon={<Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} label="Remaining Capital" value={fmt(remainingCapital)} />
        <SummaryCard icon={<Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} label="Total Invested" value={fmt(totalInvested)} />
        <SummaryCard icon={<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-profit" />} label="Total Returns Paid" value={fmt(totalReturned)} className="text-profit" />
        <SummaryCard icon={<TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />} label="Capital Returned" value={fmt(totalCapitalReturned)} className="text-warning" />
      </div>

      {/* Tabs - scrollable on mobile */}
      <Tabs defaultValue="investments" className="tabs-scrollable space-y-4">
        <TabsList className="bg-muted w-full sm:w-auto">
          <TabsTrigger value="investments" className="gap-1 text-xs sm:text-sm"><IndianRupee className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Investments</TabsTrigger>
          <TabsTrigger value="returns" className="gap-1 text-xs sm:text-sm"><TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Returns</TabsTrigger>
          <TabsTrigger value="agreements" className="gap-1 text-xs sm:text-sm"><FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Agreements</TabsTrigger>
          <TabsTrigger value="init-capital" className="gap-1 text-xs sm:text-sm"><Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Init Return</TabsTrigger>
          <TabsTrigger value="delivered" className="gap-1 text-xs sm:text-sm"><CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Returned</TabsTrigger>
        </TabsList>

        {/* Investments Tab */}
        <TabsContent value="investments">
          <div className="flex justify-end mb-4">
            <Dialog open={invOpen} onOpenChange={setInvOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Investment</Button></DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader><DialogTitle>Record Investment</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Amount (₹) *</Label><Input type="number" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} placeholder="500000" autoFocus /></div>
                    <div className="grid gap-2"><Label>Promised Return (%)</Label><Input type="number" value={invForm.promised_return} onChange={(e) => setInvForm({ ...invForm, promised_return: e.target.value })} placeholder="12" /></div>
                  </div>
                  <div className="grid gap-2"><Label>Date</Label><Input type="date" value={invForm.invested_date} onChange={(e) => setInvForm({ ...invForm, invested_date: e.target.value })} /></div>
                  <div className="grid gap-2"><Label>Notes</Label><Input value={invForm.notes} onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} placeholder="Optional notes" /></div>
                  <Button onClick={handleAddInvestment} disabled={addInvestment.isPending}>{addInvestment.isPending ? "Saving..." : "Record Investment"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {loadingInvestments ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)
            ) : investments.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">No records yet</div>
            ) : (
              investments.map((inv) => (
                <div key={inv.id} className="glass-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-foreground">{fmt(Number(inv.amount))}</span>
                    <span className="text-xs text-muted-foreground">{fmtDate(inv.invested_date)}</span>
                  </div>
                  {inv.notes && <p className="text-xs text-muted-foreground">{inv.notes}</p>}
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full" onClick={() => generateAgreement({ amount: Number(inv.amount), invested_date: inv.invested_date })}>
                    <Printer className="h-3.5 w-3.5" /> Generate Agreement
                  </Button>
                </div>
              ))
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <RecordTable loading={loadingInvestments} empty={investments.length === 0} headers={["Date", "Amount", "Notes", "Agreement"]}>
              {investments.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-5 py-3 text-sm text-muted-foreground">{fmtDate(inv.invested_date)}</td>
                  <td className="px-5 py-3 font-mono text-sm text-foreground">{fmt(Number(inv.amount))}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{inv.notes || "—"}</td>
                  <td className="px-5 py-3">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => generateAgreement({ amount: Number(inv.amount), invested_date: inv.invested_date })}>
                      <Printer className="h-3.5 w-3.5" /> Generate
                    </Button>
                  </td>
                </tr>
              ))}
            </RecordTable>
          </div>
        </TabsContent>

        {/* Monthly Returns Tab */}
        <TabsContent value="returns">
          <div className="flex justify-end mb-4">
            <Dialog open={retOpen} onOpenChange={setRetOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Return</Button></DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader><DialogTitle>Record Monthly Return</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Month *</Label>
                    <Select value={retForm.month} onValueChange={(val) => setRetForm({ ...retForm, month: val })}>
                      <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Return % *</Label>
                    <Input type="number" value={retForm.return_percent} onChange={(e) => setRetForm({ ...retForm, return_percent: e.target.value })} placeholder="2" autoFocus />
                  </div>
                  {retForm.return_percent && (
                    <p className="text-sm text-muted-foreground">
                      Calculated Amount: <span className="font-mono text-profit">{fmt(Math.round(remainingCapital * (Number(retForm.return_percent) / 100)))}</span>
                      <span className="text-xs ml-1">({retForm.return_percent}% of {fmt(remainingCapital)})</span>
                    </p>
                  )}
                  <Button onClick={handleAddReturn} disabled={addReturn.isPending}>{addReturn.isPending ? "Saving..." : "Record Return"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {loadingReturns ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)
            ) : returns.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">No records yet</div>
            ) : (
              returns.map((r) => (
                <div key={r.id} className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{fmtMonth(r.month)}</p>
                    <p className="font-mono text-xs text-profit">{Number(r.return_percent || 0)}% return</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-profit">{fmt(Number(r.amount))}</p>
                </div>
              ))
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <RecordTable loading={loadingReturns} empty={returns.length === 0} headers={["Month", "Amount (₹)", "Return %"]}>
              {returns.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-5 py-3 text-sm text-foreground">{fmtMonth(r.month)}</td>
                  <td className="px-5 py-3 font-mono text-sm text-profit">{fmt(Number(r.amount))}</td>
                  <td className="px-5 py-3 font-mono text-sm text-profit">{Number(r.return_percent || 0)}%</td>
                </tr>
              ))}
            </RecordTable>
          </div>
        </TabsContent>

        {/* Agreements Tab */}
        <TabsContent value="agreements">
          <div className="flex justify-end mb-4">
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUploadAgreement} />
            <Button size="sm" className="gap-2" onClick={() => fileRef.current?.click()} disabled={uploadAgreement.isPending}>
              <Upload className="h-4 w-4" /> {uploadAgreement.isPending ? "Uploading..." : "Upload Agreement"}
            </Button>
          </div>
          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {investorAgreements.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">No agreements uploaded yet</div>
            ) : (
              investorAgreements.map((ag) => (
                <div key={ag.id} className="glass-card p-4 flex items-center justify-between gap-3" onClick={() => openAgreementFile(ag.file_path || "")}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{ag.file_name}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(ag.uploaded_at)} · v{ag.version}</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="glass-card overflow-hidden">
              {investorAgreements.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">No agreements uploaded yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3">File</th>
                      <th className="px-5 py-3">Version</th>
                      <th className="px-5 py-3">Uploaded</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {investorAgreements.map((ag) => (
                      <tr key={ag.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">{ag.file_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4"><Badge variant="outline" className="font-mono text-[10px]">v{ag.version}</Badge></td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">{fmtDate(ag.uploaded_at)}</td>
                        <td className="px-5 py-4">
                          <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => openAgreementFile(ag.file_path || "")}>
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Initialize Capital Return Tab */}
        <TabsContent value="init-capital">
          <div className="flex justify-end mb-4">
            <Dialog open={initCapOpen} onOpenChange={setInitCapOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Initialize Capital Return</Button></DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader><DialogTitle>Initialize Capital Return</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="init-cap-amount">Amount (₹) *</Label>
                    <Input id="init-cap-amount" type="number" value={initCapForm.amount} onChange={(e) => setInitCapForm({ ...initCapForm, amount: e.target.value })} placeholder="100000" autoFocus />
                    <p className="text-xs text-muted-foreground">Remaining capital: {fmt(remainingCapital)}</p>
                  </div>
                  <div className="grid gap-2"><Label>Date</Label><Input type="date" value={initCapForm.initialized_date} onChange={(e) => setInitCapForm({ ...initCapForm, initialized_date: e.target.value })} /></div>
                  <p className="text-xs text-muted-foreground">This amount will enter a 60-day waiting period. After 60 days it will automatically be moved to Capital Returned.</p>
                  <Button onClick={handleInitializeCapitalReturn} disabled={addWaiting.isPending}>{addWaiting.isPending ? "Saving..." : "Initialize Capital Return"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {pendingEntries.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">No pending capital returns</div>
            ) : (
              pendingEntries.map((entry) => {
                const initDate = new Date(entry.initialized_date);
                const endDate = new Date(initDate);
                endDate.setDate(endDate.getDate() + 60);
                const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={entry.id} className="glass-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-foreground">{fmt(Number(entry.amount))}</span>
                      <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 text-xs">{diffDays} days left</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Started: {fmtDate(entry.initialized_date)}</span>
                      <span>Ends: {fmtLong(endDate)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="glass-card overflow-hidden">
              {pendingEntries.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">No pending capital returns</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Initialized Date</th>
                      <th className="px-5 py-3">Waiting Period Ends</th>
                      <th className="px-5 py-3">Days Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEntries.map((entry) => {
                      const initDate = new Date(entry.initialized_date);
                      const endDate = new Date(initDate);
                      endDate.setDate(endDate.getDate() + 60);
                      const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-5 py-3 font-mono text-sm text-foreground">{fmt(Number(entry.amount))}</td>
                          <td className="px-5 py-3 text-sm text-muted-foreground">{fmtLong(initDate)}</td>
                          <td className="px-5 py-3 text-sm text-warning">{fmtLong(endDate)}</td>
                          <td className="px-5 py-3">
                            <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">{diffDays} days</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Capital Returned Tab */}
        <TabsContent value="delivered">
          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {deliveredEntries.length === 0 ? (
              <div className="glass-card p-8 text-center text-muted-foreground text-sm">No delivered capital returns yet</div>
            ) : (
              deliveredEntries.map((entry) => {
                const initDate = new Date(entry.initialized_date);
                // Correct delivered date: Use delivered_at if manual override, else init + 60 days
                const deliveredDate = entry.delivered_at
                  ? new Date(entry.delivered_at)
                  : (() => {
                    const d = new Date(initDate);
                    d.setDate(d.getDate() + 60);
                    return d;
                  })();
                return (
                  <div key={entry.id} className="glass-card p-4 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm font-bold text-warning">{fmt(Number(entry.amount))}</p>
                      <p className="text-xs text-muted-foreground">Initialized: {fmtDate(entry.initialized_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-profit font-medium">Delivered</p>
                      <p className="text-xs text-muted-foreground">{fmtLong(deliveredDate)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="glass-card overflow-hidden">
              {deliveredEntries.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">No delivered capital returns yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Initialized Date</th>
                      <th className="px-5 py-3">Delivered Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveredEntries.map((entry) => {
                      const initDate = new Date(entry.initialized_date);
                      // Correct delivered date logic
                      const deliveredDate = entry.delivered_at
                        ? new Date(entry.delivered_at)
                        : (() => {
                          const d = new Date(initDate);
                          d.setDate(d.getDate() + 60);
                          return d;
                        })();
                      return (
                        <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-5 py-3 font-mono text-sm text-warning">{fmt(Number(entry.amount))}</td>
                          <td className="px-5 py-3 text-sm text-muted-foreground">{fmtLong(initDate)}</td>
                          <td className="px-5 py-3 text-sm text-profit">{fmtLong(deliveredDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Investor Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Edit Investor</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Full Name *</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="Enter full name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} type="email" placeholder="email@example.com" /></div>
              <div className="grid gap-2"><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" /></div>
            </div>
            <div className="grid gap-2"><Label>Address</Label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="City, State" /></div>
            <Button className="mt-2 w-full" onClick={handleEditSave} disabled={updateInvestor.isPending}>
              {updateInvestor.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{investor.full_name}</strong>? This will permanently remove the investor and all related records. This action cannot be undone.
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

/* Summary card component for investor profile header */
const SummaryCard = ({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: string; className?: string }) => (
  <div className="glass-card p-3 sm:p-4 space-y-1">
    <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground text-[10px] sm:text-xs font-medium uppercase tracking-wider">{icon}<span className="truncate">{label}</span></div>
    <p className={`text-base sm:text-xl font-bold font-mono break-all ${className || "text-foreground"}`}>{value}</p>
  </div>
);

/* Reusable record table component */
const RecordTable = ({ loading, empty, headers, children }: { loading: boolean; empty: boolean; headers: string[]; children: React.ReactNode }) => (
  <div className="glass-card overflow-hidden">
    {loading ? (
      <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
    ) : empty ? (
      <div className="p-8 sm:p-12 text-center text-muted-foreground text-sm">No records yet</div>
    ) : (
      <div className="table-responsive">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {headers.map((h) => <th key={h} className="px-4 sm:px-5 py-3 whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    )}
  </div>
);

export default InvestorProfile;
