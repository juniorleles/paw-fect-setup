
CREATE OR REPLACE FUNCTION public.validate_professional_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
  SELECT COALESCE(plan, 'free') INTO current_plan
  FROM subscriptions
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Plan limits: free=2, essential=5, professional=unlimited
  IF current_plan = 'professional' THEN
    RETURN NEW;
  ELSIF current_plan = 'essential' THEN
    max_allowed := 5;
  ELSE
    max_allowed := 2;
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
$function$;
