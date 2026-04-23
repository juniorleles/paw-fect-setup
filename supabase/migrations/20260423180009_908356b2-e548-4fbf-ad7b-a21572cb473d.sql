DROP POLICY IF EXISTS "Service can update whatsapp messages" ON public.whatsapp_messages;

CREATE POLICY "Admins and service can update whatsapp messages"
  ON public.whatsapp_messages FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR current_setting('role', true) = 'service_role'
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR current_setting('role', true) = 'service_role'
  );