
-- Add no-show tracking columns to appointments
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS no_show_detected_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_message_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_status text DEFAULT null;

-- Add index for efficient no-show queries
CREATE INDEX IF NOT EXISTS idx_appointments_no_show 
  ON public.appointments (status, date, time) 
  WHERE status = 'no_show';

CREATE INDEX IF NOT EXISTS idx_appointments_recovery_pending 
  ON public.appointments (recovery_status, recovery_message_sent_at) 
  WHERE recovery_status = 'pending';
