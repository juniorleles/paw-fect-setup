
CREATE OR REPLACE FUNCTION public.validate_appointment_slot()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  max_slots integer;
  current_count integer;
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

CREATE TRIGGER trg_validate_appointment_slot
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_slot();
