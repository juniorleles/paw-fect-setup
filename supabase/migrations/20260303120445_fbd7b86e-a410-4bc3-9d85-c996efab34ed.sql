
-- Create professionals table for tenant team members
CREATE TABLE public.professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'profissional',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own professionals"
ON public.professionals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own professionals"
ON public.professionals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own professionals"
ON public.professionals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own professionals"
ON public.professionals FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all professionals"
ON public.professionals FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Validation trigger to enforce plan-based user limits
CREATE OR REPLACE FUNCTION public.validate_professional_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  current_plan TEXT;
  max_allowed INTEGER;
  active_count INTEGER;
BEGIN
  -- Only validate active professionals
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- Get current plan
  SELECT COALESCE(plan, 'starter') INTO current_plan
  FROM subscriptions
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Determine limit based on plan
  IF current_plan = 'starter' THEN
    max_allowed := 1;
  ELSIF current_plan = 'professional' THEN
    max_allowed := 3;
  ELSE
    -- enterprise/pro = unlimited
    RETURN NEW;
  END IF;

  -- Count active professionals (excluding self on update)
  SELECT COUNT(*) INTO active_count
  FROM professionals
  WHERE user_id = NEW.user_id
    AND status = 'active'
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF active_count >= max_allowed THEN
    RAISE EXCEPTION 'Limite de profissionais atingido para o plano atual. Máximo permitido: %', max_allowed;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_professional_limit_trigger
BEFORE INSERT OR UPDATE ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.validate_professional_limit();
