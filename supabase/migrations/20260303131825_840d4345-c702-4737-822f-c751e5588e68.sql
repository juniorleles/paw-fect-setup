
-- Table to track reactivation messages sent to inactive clients
CREATE TABLE public.customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  message TEXT,
  campaign_month TEXT NOT NULL, -- '2026-03' format for monthly limit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON public.customer_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON public.customer_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all contacts" ON public.customer_contacts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for monthly campaign limit check
CREATE INDEX idx_customer_contacts_user_month ON public.customer_contacts (user_id, campaign_month);
