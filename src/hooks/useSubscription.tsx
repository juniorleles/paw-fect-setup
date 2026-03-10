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
  trialAppointmentsUsed: number;
  trialMessagesUsed: number;
  trialAppointmentsLimit: number;
  trialMessagesLimit: number;
  nextPlan: string | null;
  nextPlanEffectiveAt: string | null;
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
  const [plan, setPlan] = useState<string>("free");
  const [trialAppointmentsUsed, setTrialAppointmentsUsed] = useState(0);
  const [trialMessagesUsed, setTrialMessagesUsed] = useState(0);
  const [trialAppointmentsLimit, setTrialAppointmentsLimit] = useState(50);
  const [trialMessagesLimit, setTrialMessagesLimit] = useState(250);
  const [nextPlan, setNextPlan] = useState<string | null>(null);
  const [nextPlanEffectiveAt, setNextPlanEffectiveAt] = useState<string | null>(null);
  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setStatus("none");
      setTrialEndAt(null);
      setPlan("free");
      setTrialAppointmentsUsed(0);
      setTrialMessagesUsed(0);
      setTrialAppointmentsLimit(30);
      setTrialMessagesLimit(150);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, trial_end_at, plan, trial_appointments_used, trial_messages_used, trial_appointments_limit, trial_messages_limit, updated_at, next_plan, next_plan_effective_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      const latest = data?.[0];

      setStatus((latest?.status as SubscriptionStatus) ?? "none");
      setTrialEndAt(latest?.trial_end_at ?? null);
      setPlan(latest?.plan ?? "free");
      setTrialAppointmentsUsed((latest as any)?.trial_appointments_used ?? 0);
      setTrialMessagesUsed((latest as any)?.trial_messages_used ?? 0);
      setTrialAppointmentsLimit((latest as any)?.trial_appointments_limit ?? 30);
      setTrialMessagesLimit((latest as any)?.trial_messages_limit ?? 150);
      setNextPlan((latest as any)?.next_plan ?? null);
      setNextPlanEffectiveAt((latest as any)?.next_plan_effective_at ?? null);
    } catch (error) {
      console.error("fetchSubscription failed:", error);
      setStatus("none");
      setTrialEndAt(null);
      setPlan("free");
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

    // Re-fetch every 30s to keep quota counters fresh
    const interval = setInterval(fetchSubscription, 30_000);
    return () => clearInterval(interval);
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
    await fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        status, loading, cancelling, reactivating, trialEndAt, plan,
        trialAppointmentsUsed, trialMessagesUsed, trialAppointmentsLimit, trialMessagesLimit,
        nextPlan, nextPlanEffectiveAt,
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
