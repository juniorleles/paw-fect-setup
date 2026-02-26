import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
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
  const fetchedForUser = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (fetchedForUser.current === userId) return;
    fetchedForUser.current = userId;

    setLoading(true);
    const { data } = await supabase
      .from("pet_shop_configs")
      .select("activated")
      .eq("user_id", userId)
      .maybeSingle();

    setCompleted(data?.activated === true);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const refetch = useCallback(async () => {
    fetchedForUser.current = null;
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
