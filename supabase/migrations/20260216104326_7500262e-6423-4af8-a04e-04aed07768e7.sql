-- Add a 'delivered' flag to waiting_period_entries for manual delivery override
-- When true, the entry is treated as delivered regardless of the 60-day period
ALTER TABLE public.waiting_period_entries
ADD COLUMN delivered boolean NOT NULL DEFAULT false;

-- Track when manual delivery occurred
ALTER TABLE public.waiting_period_entries
ADD COLUMN delivered_at timestamp with time zone;