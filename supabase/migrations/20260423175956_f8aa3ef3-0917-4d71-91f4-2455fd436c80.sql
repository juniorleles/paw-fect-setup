-- ============================================
-- 1. Adicionar campos do Gupshup em pet_shop_configs
-- ============================================
ALTER TABLE public.pet_shop_configs
  ADD COLUMN IF NOT EXISTS whatsapp_provider TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS gupshup_app_id TEXT,
  ADD COLUMN IF NOT EXISTS gupshup_app_name TEXT,
  ADD COLUMN IF NOT EXISTS gupshup_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS gupshup_partner_app_token TEXT,
  ADD COLUMN IF NOT EXISTS gupshup_status TEXT NOT NULL DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS gupshup_connected_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 2. Tabela de mensagens do WhatsApp
-- ============================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gupshup',
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone TEXT NOT NULL,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'pending',
  external_message_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON public.whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_external_id ON public.whatsapp_messages(external_message_id);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

CREATE POLICY "Admins can view all whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  TO public
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR current_setting('role', true) = 'service_role'
    OR auth.uid() = user_id
  );

CREATE POLICY "Service can update whatsapp messages"
  ON public.whatsapp_messages FOR UPDATE
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR current_setting('role', true) = 'service_role'
  );

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. Tabela de templates HSM
-- ============================================
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gupshup',
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'UTILITY',
  language TEXT NOT NULL DEFAULT 'pt_BR',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_user_id ON public.whatsapp_templates(user_id);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON public.whatsapp_templates FOR SELECT
  TO authenticated
  USING (get_owner_id(auth.uid()) = user_id);

CREATE POLICY "Admins can view all templates"
  ON public.whatsapp_templates FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own templates"
  ON public.whatsapp_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.whatsapp_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage templates"
  ON public.whatsapp_templates FOR ALL
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR current_setting('role', true) = 'service_role'
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR current_setting('role', true) = 'service_role'
  );

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();