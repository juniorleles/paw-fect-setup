import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Resolves the "owner" user_id for the current user.
 * If the user is a professional, returns the owner's user_id.
 * Otherwise, returns the user's own id.
 */
export const useOwnerId = () => {
  const { user } = useAuth();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOwnerId(null);
      setLoading(false);
      return;
    }

    supabase
      .rpc("get_owner_id", { p_user_id: user.id })
      .then(({ data, error }) => {
        setOwnerId(error ? user.id : (data as string) ?? user.id);
        setLoading(false);
      });
  }, [user?.id]);

  return { ownerId, loading };
};
