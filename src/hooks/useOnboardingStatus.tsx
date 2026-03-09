import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingContextValue {
  completed: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setCompleted(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check if user is a professional — they skip onboarding
      const { data: isProfessional } = await supabase.rpc("is_professional", { p_user_id: userId });
      if (isProfessional) {
        setCompleted(true);
        return;
      }

      const { data, error } = await supabase
        .from("pet_shop_configs")
        .select("activated, updated_at, shop_name, phone, services")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      const config = data?.[0];
      if (!config?.activated) {
        setCompleted(false);
        return;
      }

      // Double-check: activated must have real data, not empty fields
      const services = config.services as any[];
      const hasData = config.shop_name?.trim() &&
        config.phone?.trim() &&
        Array.isArray(services) && services.length > 0;

      setCompleted(hasData === true);
    } catch (error) {
      console.error("fetch onboarding status failed:", error);
      setCompleted(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const refetch = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  return (
    <OnboardingContext.Provider value={{ completed, loading, refetch }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboardingStatus = (): OnboardingContextValue => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboardingStatus must be used within OnboardingProvider");
  }
  return context;
};
