
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
  service_duration integer;
  slot_interval integer;
  slots_needed integer;
  slot_offset integer;
  check_time time;
  conflicting_count integer;
  services_json jsonb;
  svc jsonb;
BEGIN
  -- Only validate non-cancelled, non-no_show, and non-completed appointments
  IF NEW.status IN ('cancelled', 'no_show', 'completed') THEN
    RETURN NEW;
  END IF;

  -- Also skip if we're just updating status (not changing date/time/service)
  IF TG_OP = 'UPDATE' AND OLD.date = NEW.date AND OLD.time = NEW.time AND OLD.service = NEW.service THEN
    RETURN NEW;
  END IF;

  -- Get the max concurrent appointments and services for this user
  SELECT COALESCE(max_concurrent_appointments, 1), COALESCE(services, '[]'::jsonb)
    INTO max_slots, services_json
    FROM pet_shop_configs
    WHERE user_id = NEW.user_id
    LIMIT 1;

  -- Get user plan and enforce plan-based limit
  SELECT COALESCE(plan, 'free')
    INTO user_plan
    FROM subscriptions
    WHERE user_id = NEW.user_id
    LIMIT 1;

  -- Plan limits: free=2, essential=5, professional=unlimited
  IF user_plan = 'professional' THEN
    plan_limit := 999;
  ELSIF user_plan = 'essential' THEN
    plan_limit := 5;
  ELSE
    plan_limit := 2;
  END IF;

  IF max_slots > plan_limit THEN
    max_slots := plan_limit;
  END IF;

  -- Find service duration for the NEW appointment
  service_duration := 30;
  FOR svc IN SELECT jsonb_array_elements(services_json) LOOP
    IF svc->>'name' = NEW.service THEN
      service_duration := COALESCE((svc->>'duration')::integer, 30);
      EXIT;
    END IF;
  END LOOP;

  slot_interval := 30;
  slots_needed := GREATEST(1, CEIL(service_duration::numeric / slot_interval));

  -- Check each slot this new appointment would occupy
  FOR slot_offset IN 0..(slots_needed - 1) LOOP
    check_time := NEW.time + (slot_offset * slot_interval * interval '1 minute');

    SELECT COUNT(*)
      INTO conflicting_count
      FROM appointments a
      WHERE a.user_id = NEW.user_id
        AND a.date = NEW.date
        AND a.status <> 'cancelled'
        AND a.status <> 'no_show'
        AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND check_time >= a.time
        AND check_time < a.time + (
          COALESCE(
            (SELECT (s->>'duration')::integer 
             FROM jsonb_array_elements(services_json) s 
             WHERE s->>'name' = a.service 
             LIMIT 1),
            30
          ) * interval '1 minute'
        );

    IF conflicting_count >= max_slots THEN
      RAISE EXCEPTION 'Horário lotado: o serviço "%" (% min) conflita com agendamentos existentes no horário %.', 
        NEW.service, service_duration, check_time::text;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
