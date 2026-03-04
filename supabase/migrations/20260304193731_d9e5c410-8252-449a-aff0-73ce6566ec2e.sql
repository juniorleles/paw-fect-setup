
CREATE TABLE public.conversation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  step text NOT NULL DEFAULT 'greeting',
  service text,
  date text,
  time text,
  client_name text,
  pet_name text,
  notes text,
  extra jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone)
);

ALTER TABLE public.conversation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage conversation_state" ON public.conversation_state
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR (current_setting('role'::text, true) = 'service_role'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR (current_setting('role'::text, true) = 'service_role'::text));

CREATE POLICY "Users can view own conversation_state" ON public.conversation_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
