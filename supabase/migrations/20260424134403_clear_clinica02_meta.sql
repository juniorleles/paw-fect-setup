-- Limpa o estado parcial de conexão Meta do clinica_02@testes.com
-- A WABA 2127594771323566 nunca foi compartilhada com o app MagicZap
-- (Meta API retorna "Object does not exist or missing permissions"),
-- então o registro salvo está inválido e impede nova tentativa limpa.
UPDATE public.pet_shop_configs
   SET meta_waba_id = NULL,
       meta_phone_number_id = NULL,
       meta_access_token = NULL,
       meta_credit_attached = false,
       meta_credit_attached_at = NULL,
       whatsapp_status = 'disconnected',
       whatsapp_provider = 'none'
 WHERE user_id = '96eb545d-4947-4440-8d50-d7aecfcf9f8f';
