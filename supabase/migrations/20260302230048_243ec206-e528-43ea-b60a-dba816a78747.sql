
-- Fix 1: message_buffer - Remove overly permissive policy, add admin-only SELECT
-- Service role key bypasses RLS, so edge functions still work
DROP POLICY IF EXISTS "Service can manage message buffer" ON public.message_buffer;

CREATE POLICY "Admins can manage message buffer"
ON public.message_buffer
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow service-level inserts (for edge functions using anon key if needed)
CREATE POLICY "Service can insert message buffer"
ON public.message_buffer
FOR INSERT
WITH CHECK (true);

-- Fix 2: conversation_locks - Remove overly permissive policy
DROP POLICY IF EXISTS "Service can manage conversation locks" ON public.conversation_locks;

CREATE POLICY "Admins can manage conversation locks"
ON public.conversation_locks
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert conversation locks"
ON public.conversation_locks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update conversation locks"
ON public.conversation_locks
FOR UPDATE
USING (true);

-- Fix 3: leads - Restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;

CREATE POLICY "Admins can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
