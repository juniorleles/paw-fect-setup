import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionStatus = "active" | "cancelled" | "expired" | "none";

interface SubscriptionContextValue {
  status: SubscriptionStatus;
  loading: boolean;
  cancelling: boolean;
  reactivating: boolean;
  trialEndAt: string | null;
  plan: string;
  cancel: () => Promise<{ error?: string }>;
  reactivate: () => Promise<{ error?: string; qr_code?: string }>;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>("none");
  const [trialEndAt, setTrialEndAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [plan, setPlan] = useState<string>("starter");

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("status, trial_end_at, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    setStatus((data?.status as SubscriptionStatus) ?? "none");
    setTrialEndAt(data?.trial_end_at ?? null);
    setPlan(data?.plan ?? "starter");
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const cancel = async (): Promise<{ error?: string }> => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        method: "POST",
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };
      setStatus("cancelled");
      return {};
    } catch (e: any) {
      return { error: e.message };
    } finally {
      setCancelling(false);
    }
  };

  const reactivate = async (): Promise<{ error?: string; qr_code?: string }> => {
    setReactivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("reactivate-subscription", {
        method: "POST",
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };
      setStatus("active");
      return { qr_code: data?.qr_code };
    } catch (e: any) {
      return { error: e.message };
    } finally {
      setReactivating(false);
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{ status, loading, cancelling, reactivating, trialEndAt, plan, cancel, reactivate, refetch: fetchSubscription }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextValue => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
