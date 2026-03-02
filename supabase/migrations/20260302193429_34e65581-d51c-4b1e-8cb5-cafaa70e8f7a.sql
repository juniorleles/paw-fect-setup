ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_appointments_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_messages_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_appointments_limit integer NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS trial_messages_limit integer NOT NULL DEFAULT 250;