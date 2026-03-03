import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from "react";
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
  trialAppointmentsUsed: number;
  trialMessagesUsed: number;
  trialAppointmentsLimit: number;
  trialMessagesLimit: number;
  cancel: () => Promise<{ error?: string }>;
  reactivate: () => Promise<{ error?: string; qr_code?: string }>;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [status, setStatus] = useState<SubscriptionStatus>("none");
  const [trialEndAt, setTrialEndAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [plan, setPlan] = useState<string>("starter");
  const [trialAppointmentsUsed, setTrialAppointmentsUsed] = useState(0);
  const [trialMessagesUsed, setTrialMessagesUsed] = useState(0);
  const [trialAppointmentsLimit, setTrialAppointmentsLimit] = useState(50);
  const [trialMessagesLimit, setTrialMessagesLimit] = useState(250);
  const fetchedForUser = useRef<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (fetchedForUser.current === userId) {
      setLoading(false);
      return;
    }

    fetchedForUser.current = userId;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, trial_end_at, plan, trial_appointments_used, trial_messages_used, trial_appointments_limit, trial_messages_limit")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setStatus((data?.status as SubscriptionStatus) ?? "none");
      setTrialEndAt(data?.trial_end_at ?? null);
      setPlan(data?.plan ?? "starter");
      setTrialAppointmentsUsed((data as any)?.trial_appointments_used ?? 0);
      setTrialMessagesUsed((data as any)?.trial_messages_used ?? 0);
      setTrialAppointmentsLimit((data as any)?.trial_appointments_limit ?? 30);
      setTrialMessagesLimit((data as any)?.trial_messages_limit ?? 150);
    } catch (error) {
      console.error("fetchSubscription failed:", error);
      setStatus("none");
      setTrialEndAt(null);
      setPlan("starter");
      setTrialAppointmentsUsed(0);
      setTrialMessagesUsed(0);
      setTrialAppointmentsLimit(30);
      setTrialMessagesLimit(150);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

  const refetch = useCallback(async () => {
    fetchedForUser.current = null;
    await fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        status, loading, cancelling, reactivating, trialEndAt, plan,
        trialAppointmentsUsed, trialMessagesUsed, trialAppointmentsLimit, trialMessagesLimit,
        cancel, reactivate, refetch,
      }}
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
