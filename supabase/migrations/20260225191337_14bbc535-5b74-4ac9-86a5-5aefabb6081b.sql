CREATE OR REPLACE FUNCTION public.validate_appointment_slot()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  max_slots integer;
  current_count integer;
  user_plan text;
  plan_limit integer;
BEGIN
  -- Only validate non-cancelled appointments
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Get the max concurrent appointments for this user
  SELECT COALESCE(max_concurrent_appointments, 1)
    INTO max_slots
    FROM pet_shop_configs
    WHERE user_id = NEW.user_id
    LIMIT 1;

  -- Get user plan and enforce plan-based limit
  SELECT COALESCE(plan, 'starter')
    INTO user_plan
    FROM subscriptions
    WHERE user_id = NEW.user_id
    LIMIT 1;

  -- Starter: max 1 attendant, Professional: max 5
  IF user_plan = 'professional' THEN
    plan_limit := 5;
  ELSE
    plan_limit := 1;
  END IF;

  -- Use the lesser of configured and plan limit
  IF max_slots > plan_limit THEN
    max_slots := plan_limit;
  END IF;

  -- Count existing active bookings at the same date+time (excluding current record on update)
  SELECT COUNT(*)
    INTO current_count
    FROM appointments
    WHERE user_id = NEW.user_id
      AND date = NEW.date
      AND time = NEW.time
      AND status <> 'cancelled'
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF current_count >= max_slots THEN
    RAISE EXCEPTION 'Horário lotado: todos os % atendentes já estão ocupados neste horário.', max_slots;
  END IF;

  RETURN NEW;
END;
$function$;