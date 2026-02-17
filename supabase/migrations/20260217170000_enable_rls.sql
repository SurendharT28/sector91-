
-- =============================================
-- SECURITY: Enable Strict RLS on All Tables
-- =============================================

-- 1. Enable RLS on all tables (Idempotent)
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_pnl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_returns ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old permissive policies ("Allow all...")
DROP POLICY IF EXISTS "Allow all on investors" ON public.investors;
DROP POLICY IF EXISTS "Allow all on trading_accounts" ON public.trading_accounts;
DROP POLICY IF EXISTS "Allow all on daily_pnl" ON public.daily_pnl;
DROP POLICY IF EXISTS "Allow all on agreements" ON public.agreements;
DROP POLICY IF EXISTS "Allow all on monthly_returns" ON public.monthly_returns;
DROP POLICY IF EXISTS "Allow all on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow all on investments" ON public.investments;
DROP POLICY IF EXISTS "Allow all on capital_returns" ON public.capital_returns;

-- 3. Create Strict Policies (Authenticated Users Only)
-- Ideally, we should check user_id if tables had it, but for this app "Authenticated" = "Admin"
-- So we allow FULL access to any logged-in user.

-- Helper to create full access policy for authenticated users
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        -- Drop existing "Authenticated Full Access" if exists to avoid error
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated Full Access" ON public.%I', tbl);
        
        -- Create new policy
        EXECUTE format('CREATE POLICY "Authenticated Full Access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
        
        -- Optional: Allow public read if needed? 
        -- User requested "Restrict admin-only operations", implying strict auth.
        -- We will NOT create public policies properly except potentially for storage if images are public.
    END LOOP;
END
$$;
