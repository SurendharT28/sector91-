
-- Table for individual investment records per investor
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  invested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on investments" ON public.investments FOR ALL USING (true) WITH CHECK (true);

-- Table for capital return records per investor
CREATE TABLE public.capital_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  returned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on capital_returns" ON public.capital_returns FOR ALL USING (true) WITH CHECK (true);

-- Add return_percent to monthly_returns for display
ALTER TABLE public.monthly_returns ADD COLUMN IF NOT EXISTS return_percent NUMERIC DEFAULT 0;
