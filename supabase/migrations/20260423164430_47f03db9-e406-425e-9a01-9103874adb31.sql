ALTER TABLE public.pet_shop_configs
  ADD COLUMN IF NOT EXISTS meta_credit_attached boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_credit_attached_at timestamp with time zone;

COMMENT ON COLUMN public.pet_shop_configs.meta_credit_attached IS 'True when MagicZap Extended Credit Line is attached to this WABA (Model B - MagicZap pays).';
COMMENT ON COLUMN public.pet_shop_configs.meta_credit_attached_at IS 'Timestamp when credit line was successfully attached to this WABA.';