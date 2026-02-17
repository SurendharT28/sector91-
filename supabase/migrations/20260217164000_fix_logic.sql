
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
