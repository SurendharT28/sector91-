
-- This migration was applied but failed to update password due to schema issues.
-- It is restored here to satisfy supabase cli history checks.
-- The actual fix is in 20260217182000_force_admin_password_retry.sql
DO $$ BEGIN NULL; END $$;
