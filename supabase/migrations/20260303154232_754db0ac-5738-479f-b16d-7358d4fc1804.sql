
ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status = ANY (ARRAY['pending', 'confirmed', 'completed', 'cancelled', 'no_show']));
