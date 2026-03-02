CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));