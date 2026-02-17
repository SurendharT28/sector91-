
-- Enable RLS on all tables with permissive policies (single-user app, no auth)
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on investors" ON public.investors FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on trading_accounts" ON public.trading_accounts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.daily_pnl ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on daily_pnl" ON public.daily_pnl FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on agreements" ON public.agreements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.monthly_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on monthly_returns" ON public.monthly_returns FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
