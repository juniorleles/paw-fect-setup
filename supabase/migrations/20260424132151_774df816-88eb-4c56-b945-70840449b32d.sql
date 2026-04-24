DO $$
DECLARE
  v_user_id UUID := '96eb545d-4947-4440-8d50-d7aecfcf9f8f';
BEGIN
  DELETE FROM public.pet_shop_configs WHERE user_id = v_user_id;
  DELETE FROM public.appointments WHERE user_id = v_user_id;
  DELETE FROM public.whatsapp_messages WHERE user_id = v_user_id;
  DELETE FROM public.whatsapp_templates WHERE user_id = v_user_id;
  DELETE FROM public.conversation_messages WHERE user_id = v_user_id;
  DELETE FROM public.conversation_state WHERE user_id = v_user_id;
  DELETE FROM public.customer_contacts WHERE user_id = v_user_id;
  DELETE FROM public.subscriptions WHERE user_id = v_user_id;
  DELETE FROM public.professionals WHERE user_id = v_user_id OR auth_user_id = v_user_id;
  DELETE FROM public.inactive_campaign_logs WHERE user_id = v_user_id;
  DELETE FROM public.usage_monthly WHERE user_id = v_user_id;
  DELETE FROM public.payment_history WHERE user_id = v_user_id;
  DELETE FROM public.subscription_logs WHERE user_id = v_user_id;
  DELETE FROM public.ai_usage WHERE user_id = v_user_id;
END $$;