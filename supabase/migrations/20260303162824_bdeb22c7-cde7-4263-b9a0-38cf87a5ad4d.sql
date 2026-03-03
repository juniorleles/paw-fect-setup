ALTER TABLE public.pet_shop_configs
ADD COLUMN campaign_messages jsonb NOT NULL DEFAULT '{}'::jsonb;