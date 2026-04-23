UPDATE public.pet_shop_configs
SET
  whatsapp_status = 'disconnected',
  whatsapp_provider = 'none',
  evolution_instance_name = '',
  meta_phone_number_id = NULL,
  meta_waba_id = NULL,
  meta_access_token = NULL,
  meta_credit_attached = false,
  meta_credit_attached_at = NULL,
  gupshup_app_id = NULL,
  gupshup_app_name = NULL,
  gupshup_phone_number = NULL,
  gupshup_partner_app_token = NULL,
  gupshup_status = 'disconnected',
  gupshup_connected_at = NULL,
  updated_at = now()
WHERE user_id = '77351880-b26a-4aaf-9749-59750bf9cfa3';