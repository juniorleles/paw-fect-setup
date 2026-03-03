
-- Add reminder_24h_sent boolean to appointments for deduplication
ALTER TABLE public.appointments ADD COLUMN reminder_24h_sent BOOLEAN NOT NULL DEFAULT false;
