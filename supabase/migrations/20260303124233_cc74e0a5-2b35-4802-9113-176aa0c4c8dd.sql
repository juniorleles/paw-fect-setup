
-- 1. Add usage_reset_at to track monthly reset cycles
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- 2. Atomic increment function for trial_messages_used
-- Returns the new count; if >= limit, the caller knows it's blocked
CREATE OR REPLACE FUNCTION public.increment_trial_messages(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE subscriptions
  SET trial_messages_used = trial_messages_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING trial_messages_used INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$;

-- 3. Atomic increment function for trial_appointments_used
CREATE OR REPLACE FUNCTION public.increment_trial_appointments(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE subscriptions
  SET trial_appointments_used = trial_appointments_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING trial_appointments_used INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$;

-- 4. Monthly reset function (called by cron)
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reset_count integer;
BEGIN
  UPDATE subscriptions
  SET trial_messages_used = 0,
      trial_appointments_used = 0,
      usage_reset_at = now(),
      updated_at = now()
  WHERE usage_reset_at <= now() - interval '30 days'
    AND status = 'active';
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$;
