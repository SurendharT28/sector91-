-- Add waiting_period_start to track when investor entered waiting period
ALTER TABLE public.investors ADD COLUMN waiting_period_start timestamp with time zone DEFAULT NULL;

-- Update status default to 'active' (already set but being explicit)
-- Valid statuses: 'active', 'waiting_period', 'inactive'