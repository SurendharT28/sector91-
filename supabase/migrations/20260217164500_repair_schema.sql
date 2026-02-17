
-- =============================================
-- REPAIR: Ensure Investments Table Exists
-- =============================================

CREATE TABLE IF NOT EXISTS public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  invested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS if not enabled (idempotent)
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Re-apply policy if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'Allow all on investments'
    ) THEN
        CREATE POLICY "Allow all on investments" ON public.investments FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- =============================================
-- LOGIC FIX: Auto-calculate Investor Totals
-- =============================================

-- Function to calculate total investment for an investor
CREATE OR REPLACE FUNCTION public.calculate_investor_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update investment_amount in investors table
  UPDATE public.investors
  SET investment_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.investments
    WHERE investor_id = COALESCE(NEW.investor_id, OLD.investor_id)
  )
  WHERE id = COALESCE(NEW.investor_id, OLD.investor_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for INVESTMENTS table
DROP TRIGGER IF EXISTS trg_update_investor_totals ON public.investments;
CREATE TRIGGER trg_update_investor_totals
AFTER INSERT OR UPDATE OR DELETE ON public.investments
FOR EACH ROW
EXECUTE FUNCTION public.calculate_investor_totals();
