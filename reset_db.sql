-- ⚠️ WARNING: THIS SCRIPT DELETES ALL DATA FROM THE DATABASE ⚠️
-- Run this in the Supabase SQL Editor to clear all tables.

TRUNCATE TABLE 
    public.investors, 
    public.trading_accounts, 
    public.daily_pnl, 
    public.agreements, 
    public.monthly_returns, 
    public.audit_logs, 
    public.expenses, 
    public.investments, 
    public.capital_returns, 
    public.waiting_period_entries
RESTART IDENTITY CASCADE;

-- Optional: Verify empty state
SELECT count(*) as investor_count FROM public.investors;
