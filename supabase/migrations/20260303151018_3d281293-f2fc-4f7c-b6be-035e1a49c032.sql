
-- Create inactive_campaign_logs table for tracking reactivation campaigns
CREATE TABLE public.inactive_campaign_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  last_service TEXT,
  days_inactive INTEGER,
  message_sent TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  campaign_month TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'INACTIVE_RECOVERY',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inactive_campaign_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own campaign logs"
ON public.inactive_campaign_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign logs"
ON public.inactive_campaign_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all campaign logs"
ON public.inactive_campaign_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for monthly campaign limit check
CREATE INDEX idx_campaign_logs_user_month ON public.inactive_campaign_logs (user_id, campaign_month);
