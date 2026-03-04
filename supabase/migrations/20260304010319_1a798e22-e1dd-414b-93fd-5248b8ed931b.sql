
-- Add next_plan column for scheduled downgrades
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS next_plan text DEFAULT NULL;

-- Add next_plan_effective_at for when the downgrade takes effect
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS next_plan_effective_at timestamp with time zone DEFAULT NULL;
