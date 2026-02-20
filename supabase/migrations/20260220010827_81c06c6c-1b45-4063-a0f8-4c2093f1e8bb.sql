-- Add per-user Evolution API instance tracking
ALTER TABLE public.pet_shop_configs
ADD COLUMN evolution_instance_name text NOT NULL DEFAULT '',
ADD COLUMN whatsapp_status text NOT NULL DEFAULT 'disconnected';

-- Add index for quick lookups
CREATE INDEX idx_pet_shop_configs_evolution_instance ON public.pet_shop_configs(evolution_instance_name);
