-- 1. Create Audit Log Trigger Function
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_val json;
  new_val json;
  table_name text := TG_TABLE_NAME;
  user_id text;
  action_type text;
BEGIN
  -- Determine action
  IF (TG_OP = 'DELETE') THEN
    old_val := row_to_json(OLD);
    new_val := null;
    action_type := 'DELETE';
  ELSIF (TG_OP = 'UPDATE') THEN
    old_val := row_to_json(OLD);
    new_val := row_to_json(NEW);
    action_type := 'UPDATE';
  ELSIF (TG_OP = 'INSERT') THEN
    old_val := null;
    new_val := row_to_json(NEW);
    action_type := 'INSERT';
  END IF;

  -- Get user ID if available (Supabase auth)
  user_id := auth.uid()::text;
  
  -- Insert into audit_logs
  INSERT INTO public.audit_logs (
    timestamp,
    action,
    reference_id,
    module,
    notes
  ) VALUES (
    now(),
    action_type || ' on ' || table_name,
    COALESCE(new_val->>'id', old_val->>'id'), -- Try to get ID
    table_name,
    CASE 
      WHEN action_type = 'UPDATE' THEN 
        'Changed by ' || COALESCE(user_id, 'system') || '. ' || 
        'Old: ' || LEFT(old_val::text, 100) || '... New: ' || LEFT(new_val::text, 100) || '...'
      WHEN action_type = 'DELETE' THEN
        'Deleted by ' || COALESCE(user_id, 'system') || '. Data: ' || LEFT(old_val::text, 200)
      ELSE
        'Created by ' || COALESCE(user_id, 'system')
    END
  );

  RETURN NULL; -- Result is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply Triggers to Key Tables

-- Investors
DROP TRIGGER IF EXISTS trg_audit_investors ON public.investors;
CREATE TRIGGER trg_audit_investors
AFTER UPDATE OR DELETE ON public.investors
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Trading Accounts
DROP TRIGGER IF EXISTS trg_audit_trading_accounts ON public.trading_accounts;
CREATE TRIGGER trg_audit_trading_accounts
AFTER UPDATE OR DELETE ON public.trading_accounts
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Daily PnL
DROP TRIGGER IF EXISTS trg_audit_daily_pnl ON public.daily_pnl;
CREATE TRIGGER trg_audit_daily_pnl
AFTER UPDATE OR DELETE ON public.daily_pnl
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Investments
DROP TRIGGER IF EXISTS trg_audit_investments ON public.investments;
CREATE TRIGGER trg_audit_investments
AFTER UPDATE OR DELETE ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Capital Returns
DROP TRIGGER IF EXISTS trg_audit_capital_returns ON public.capital_returns;
CREATE TRIGGER trg_audit_capital_returns
AFTER UPDATE OR DELETE ON public.capital_returns
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Waiting Period
DROP TRIGGER IF EXISTS trg_audit_waiting_period_entries ON public.waiting_period_entries;
CREATE TRIGGER trg_audit_waiting_period_entries
AFTER UPDATE OR DELETE ON public.waiting_period_entries
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();

-- Monthly Returns
DROP TRIGGER IF EXISTS trg_audit_monthly_returns ON public.monthly_returns;
CREATE TRIGGER trg_audit_monthly_returns
AFTER UPDATE OR DELETE ON public.monthly_returns
FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes();
