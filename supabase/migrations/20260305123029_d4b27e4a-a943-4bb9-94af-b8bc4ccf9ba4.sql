
-- =====================================================
-- ETAPA 3: RLS para profissionais usando get_owner_id()
-- =====================================================

-- 1. APPOINTMENTS - Profissionais podem CRUD nos agendamentos do dono
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
CREATE POLICY "Users can view their own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own appointments" ON public.appointments;
CREATE POLICY "Users can insert their own appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (get_owner_id(auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
CREATE POLICY "Users can update their own appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;
CREATE POLICY "Users can delete their own appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

-- 2. PET_SHOP_CONFIGS - Profissionais podem VER as configs do dono (read-only)
DROP POLICY IF EXISTS "Users can view their own config" ON public.pet_shop_configs;
CREATE POLICY "Users can view their own config"
  ON public.pet_shop_configs FOR SELECT TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

-- 3. SUBSCRIPTIONS - Profissionais podem VER a assinatura do dono
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

-- 4. CONVERSATION_MESSAGES - Profissionais podem VER mensagens do dono
DROP POLICY IF EXISTS "Users can view their own conversation messages" ON public.conversation_messages;
CREATE POLICY "Users can view their own conversation messages"
  ON public.conversation_messages FOR SELECT TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

-- 5. CUSTOMER_CONTACTS - Profissionais podem VER contatos do dono
DROP POLICY IF EXISTS "Users can view own contacts" ON public.customer_contacts;
CREATE POLICY "Users can view own contacts"
  ON public.customer_contacts FOR SELECT TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

-- 6. INACTIVE_CAMPAIGN_LOGS - Profissionais podem VER logs de campanha do dono
DROP POLICY IF EXISTS "Users can view own campaign logs" ON public.inactive_campaign_logs;
CREATE POLICY "Users can view own campaign logs"
  ON public.inactive_campaign_logs FOR SELECT TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

-- 7. PROFESSIONALS - Profissionais podem VER a lista do dono
DROP POLICY IF EXISTS "Users can view their own professionals" ON public.professionals;
CREATE POLICY "Users can view their own professionals"
  ON public.professionals FOR SELECT TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);
