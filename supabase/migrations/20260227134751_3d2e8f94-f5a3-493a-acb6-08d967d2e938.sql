CREATE TABLE public.message_buffer (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name text NOT NULL,
  sender_phone text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_message_buffer_lookup ON public.message_buffer (instance_name, sender_phone, processed, created_at);

ALTER TABLE public.message_buffer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage message buffer" ON public.message_buffer FOR ALL USING (true) WITH CHECK (true);