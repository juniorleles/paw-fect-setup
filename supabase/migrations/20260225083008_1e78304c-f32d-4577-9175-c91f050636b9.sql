-- Add response time tracking to ai_usage
ALTER TABLE public.ai_usage ADD COLUMN response_time_ms integer DEFAULT 0;

-- Add index for efficient time-based queries
CREATE INDEX idx_ai_usage_created_at ON public.ai_usage (created_at DESC);

-- Create alerts table for automated monitoring
CREATE TABLE public.system_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all alerts"
ON public.system_alerts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update alerts"
ON public.system_alerts FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert alerts"
ON public.system_alerts FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_system_alerts_created ON public.system_alerts (created_at DESC);
CREATE INDEX idx_system_alerts_resolved ON public.system_alerts (resolved, created_at DESC);