
-- 1. Tighten conversation_locks UPDATE policy: restrict to service role or admin
DROP POLICY IF EXISTS "Service can update conversation locks" ON public.conversation_locks;
CREATE POLICY "Service can update conversation locks"
ON public.conversation_locks
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR current_setting('role', true) = 'service_role'
);

-- 2. Tighten conversation_locks INSERT policy
DROP POLICY IF EXISTS "Service can insert conversation locks" ON public.conversation_locks;
CREATE POLICY "Service can insert conversation locks"
ON public.conversation_locks
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR current_setting('role', true) = 'service_role'
);

-- 3. Add DELETE policy for conversation_locks (missing)
CREATE POLICY "Admins can delete conversation locks"
ON public.conversation_locks
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Tighten message_buffer INSERT policy
DROP POLICY IF EXISTS "Service can insert message buffer" ON public.message_buffer;
CREATE POLICY "Service can insert message buffer"
ON public.message_buffer
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR current_setting('role', true) = 'service_role'
);

-- 5. Tighten admin_error_logs INSERT policy
DROP POLICY IF EXISTS "Service can insert error logs" ON public.admin_error_logs;
CREATE POLICY "Service can insert error logs"
ON public.admin_error_logs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR current_setting('role', true) = 'service_role'
);

-- 6. Tighten ai_usage INSERT policy
DROP POLICY IF EXISTS "Service can insert ai_usage" ON public.ai_usage;
CREATE POLICY "Service can insert ai_usage"
ON public.ai_usage
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR current_setting('role', true) = 'service_role'
);

-- 7. Tighten system_alerts INSERT policy
DROP POLICY IF EXISTS "Service can insert alerts" ON public.system_alerts;
CREATE POLICY "Service can insert alerts"
ON public.system_alerts
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR current_setting('role', true) = 'service_role'
);
