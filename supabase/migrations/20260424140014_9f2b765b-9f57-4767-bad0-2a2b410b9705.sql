UPDATE public.pet_shop_configs
SET 
  meta_waba_id = NULL,
  meta_phone_number_id = NULL,
  meta_access_token = NULL,
  whatsapp_status = 'disconnected',
  meta_credit_attached = false,
  meta_credit_attached_at = NULL,
  updated_at = now()
WHERE user_id = '96eb545d-4947-4440-8d50-d7aecfcf9f8f';