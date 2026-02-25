
-- Allow admins to view all payment_history
CREATE POLICY "Admins can view all payments"
ON public.payment_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all conversation_messages
CREATE POLICY "Admins can view all messages"
ON public.conversation_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all pet_shop_configs
CREATE POLICY "Admins can view all configs"
ON public.pet_shop_configs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
