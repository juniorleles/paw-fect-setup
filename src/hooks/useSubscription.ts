import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SubscriptionStatus = "active" | "cancelled" | "none";

export const useSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>("none");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    setStatus((data?.status as SubscriptionStatus) ?? "none");
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

  const reactivate = async (): Promise<{ error?: string }> => {
    setReactivating(true);
    try {
      const { data, error } = await supabase.functions.invoke("reactivate-subscription", {
        method: "POST",
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };
      setStatus("active");
      return {};
    } catch (e: any) {
      return { error: e.message };
    } finally {
      setReactivating(false);
    }
  };

  return { status, loading, cancelling, reactivating, cancel, reactivate, refetch: fetchSubscription };
};
