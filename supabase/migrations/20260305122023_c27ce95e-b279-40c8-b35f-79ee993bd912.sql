
-- Add auth_user_id column to link professionals to their own auth account
ALTER TABLE public.professionals ADD COLUMN auth_user_id uuid UNIQUE;

-- Helper function: resolve the "owner" user_id for any authenticated user
-- If the user is a professional, returns the owner's user_id
-- Otherwise returns the user's own id (they ARE the owner)
CREATE OR REPLACE FUNCTION public.get_owner_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT user_id FROM public.professionals WHERE auth_user_id = p_user_id AND status = 'active' LIMIT 1),
    p_user_id
  )
$$;

-- Helper function: check if a user is a professional (not an owner)
CREATE OR REPLACE FUNCTION public.is_professional(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professionals WHERE auth_user_id = p_user_id AND status = 'active'
  )
$$;
