
-- Expand subscriptions table with trial, plan, and payment fields
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS trial_start_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_end_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS current_period_start timestamp with time zone,
  ADD COLUMN IF NOT EXISTS current_period_end timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_payment_status text DEFAULT NULL;

-- Update status of existing active subscriptions to 'trialing' if they have no plan set
-- (existing rows will get 'starter' as default)

-- Create usage_monthly table
CREATE TABLE IF NOT EXISTS public.usage_monthly (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  month text NOT NULL, -- format YYYY-MM
  messages_used integer NOT NULL DEFAULT 0,
  messages_limit integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON public.usage_monthly FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.usage_monthly FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON public.usage_monthly FOR UPDATE
  USING (auth.uid() = user_id);

-- Create payment_history table (mock/UI purposes)
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  description text NOT NULL DEFAULT 'Mensalidade',
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  paid_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON public.payment_history FOR SELECT
  USING (auth.uid() = user_id);
