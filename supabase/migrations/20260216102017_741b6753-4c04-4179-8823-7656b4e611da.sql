
CREATE TABLE public.waiting_period_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  initialized_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waiting_period_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on waiting_period_entries" ON public.waiting_period_entries FOR ALL USING (true) WITH CHECK (true);
