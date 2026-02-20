
-- Add confirmation tracking column to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS confirmation_message_sent_at timestamp with time zone DEFAULT NULL;
