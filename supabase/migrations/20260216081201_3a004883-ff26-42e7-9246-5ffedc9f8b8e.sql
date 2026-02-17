
-- =============================================
-- INVESTORS TABLE
-- =============================================
CREATE TABLE public.investors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  investment_amount NUMERIC DEFAULT 0,
  promised_return NUMERIC DEFAULT 0,
  joining_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TRADING ACCOUNTS TABLE
-- =============================================
CREATE TABLE public.trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  broker TEXT DEFAULT '',
  capital_allocated NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- DAILY P&L TABLE
-- =============================================
CREATE TABLE public.daily_pnl (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  index_name TEXT DEFAULT 'NIFTY',
  pnl_amount NUMERIC DEFAULT 0,
  capital_used NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  pnl_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- AGREEMENTS TABLE
-- =============================================
CREATE TABLE public.agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  file_name TEXT DEFAULT '',
  file_path TEXT DEFAULT '',
  version INTEGER DEFAULT 1,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- MONTHLY RETURNS TABLE
-- =============================================
CREATE TABLE public.monthly_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- AUDIT LOGS TABLE
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL,
  reference_id TEXT DEFAULT '',
  module TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);

-- =============================================
-- TRIGGER: Auto-generate client_id for investors
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_client_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(client_id FROM 'S91-INV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.investors;
  
  NEW.client_id := 'S91-INV-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_generate_client_id
BEFORE INSERT ON public.investors
FOR EACH ROW
WHEN (NEW.client_id IS NULL)
EXECUTE FUNCTION public.generate_client_id();

-- =============================================
-- TRIGGER: Auto-calculate pnl_percent
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_pnl_percent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.capital_used > 0 THEN
    NEW.pnl_percent := ROUND((NEW.pnl_amount / NEW.capital_used) * 100, 2);
  ELSE
    NEW.pnl_percent := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_calculate_pnl_percent
BEFORE INSERT OR UPDATE ON public.daily_pnl
FOR EACH ROW
EXECUTE FUNCTION public.calculate_pnl_percent();

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_investors_updated_at
BEFORE UPDATE ON public.investors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_trading_accounts_updated_at
BEFORE UPDATE ON public.trading_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- STORAGE BUCKET for agreements
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements', 'agreements', true);

-- Allow public read access to agreements bucket
CREATE POLICY "Public read access for agreements"
ON storage.objects FOR SELECT
USING (bucket_id = 'agreements');

-- Allow anyone to upload to agreements bucket (single-user app)
CREATE POLICY "Allow uploads to agreements"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'agreements');

-- Allow anyone to delete from agreements bucket
CREATE POLICY "Allow deletes from agreements"
ON storage.objects FOR DELETE
USING (bucket_id = 'agreements');
