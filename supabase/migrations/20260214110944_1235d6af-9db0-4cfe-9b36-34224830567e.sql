
-- Create pet shop configurations table
CREATE TABLE public.pet_shop_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  shop_name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  business_hours JSONB NOT NULL DEFAULT '[]'::jsonb,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  voice_tone TEXT NOT NULL DEFAULT 'friendly',
  assistant_name TEXT NOT NULL DEFAULT '',
  activated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_shop_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own config"
  ON public.pet_shop_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own config"
  ON public.pet_shop_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own config"
  ON public.pet_shop_configs FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pet_shop_configs_updated_at
  BEFORE UPDATE ON public.pet_shop_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
