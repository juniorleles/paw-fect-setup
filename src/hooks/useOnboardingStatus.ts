import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useOnboardingStatus = () => {
  const { user } = useAuth();

  const { data: completed, isLoading } = useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("pet_shop_configs")
        .select("activated")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.activated === true;
    },
    enabled: !!user,
  });

  return { completed: completed ?? false, loading: isLoading };
};
