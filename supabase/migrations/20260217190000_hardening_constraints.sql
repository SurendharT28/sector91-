-- Hardening Constraints Migration

-- 1. Money must be positive
ALTER TABLE public.investors 
  ADD CONSTRAINT investors_investment_amount_check CHECK (investment_amount >= 0);

ALTER TABLE public.investments 
  ADD CONSTRAINT investments_amount_check CHECK (amount >= 0);

ALTER TABLE public.capital_returns 
  ADD CONSTRAINT capital_returns_amount_check CHECK (amount >= 0);

ALTER TABLE public.waiting_period_entries 
  ADD CONSTRAINT waiting_period_entries_amount_check CHECK (amount >= 0);

ALTER TABLE public.trading_accounts 
  ADD CONSTRAINT trading_accounts_capital_allocated_check CHECK (capital_allocated >= 0);

ALTER TABLE public.daily_pnl 
  ADD CONSTRAINT daily_pnl_capital_used_check CHECK (capital_used >= 0);

-- 2. Overflow Protection (10 Billion Limit)
ALTER TABLE public.investors 
  ADD CONSTRAINT investors_investment_amount_max_check CHECK (investment_amount <= 10000000000);

ALTER TABLE public.investments 
  ADD CONSTRAINT investments_amount_max_check CHECK (amount <= 10000000000);

ALTER TABLE public.trading_accounts 
  ADD CONSTRAINT trading_accounts_capital_allocated_max_check CHECK (capital_allocated <= 10000000000);

-- 3. Unique Constraints
ALTER TABLE public.trading_accounts 
  ADD CONSTRAINT trading_accounts_name_key UNIQUE (name);

-- 4. Ensure NOT NULL (double check, though mostly already covered)
-- Joining date should ideally be known
UPDATE public.investors SET joining_date = CURRENT_DATE WHERE joining_date IS NULL;
ALTER TABLE public.investors ALTER COLUMN joining_date SET NOT NULL;
