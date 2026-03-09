import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type WhatsAppStatus = "connected" | "disconnected" | "pending";
export type WhatsAppProvider = "meta" | "evolution" | null;

const SYNC_INTERVAL_MS = 60_000; // Sync every 60s

export const useWhatsAppStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus>("disconnected");
  const [provider, setProvider] = useState<WhatsAppProvider>(null);
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    // Fetch initial status + provider from DB
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("pet_shop_configs")
        .select("whatsapp_status, meta_waba_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.whatsapp_status) {
        setStatus(data.whatsapp_status as WhatsAppStatus);
      }
      if (data?.meta_waba_id) {
        setProvider("meta");
      } else {
        setProvider("evolution");
      }
    };
    fetchStatus();

    // Sync periodically
    const syncStatus = async () => {
      try {
        const { data } = await supabase.functions.invoke("sync-whatsapp-status", {
          method: "POST",
        });
        if (data?.status) {
          setStatus(data.status as WhatsAppStatus);
        }
        if (data?.provider) {
          setProvider(data.provider as WhatsAppProvider);
        }
        lastSyncRef.current = Date.now();
      } catch {
        // Silent fail — DB realtime will catch up
      }
    };

    // Initial sync after a short delay
    const initialTimeout = setTimeout(syncStatus, 3000);

    // Periodic sync
    const interval = setInterval(syncStatus, SYNC_INTERVAL_MS);

    // Subscribe to realtime changes
    const channel = supabase
      .channel("whatsapp-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pet_shop_configs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new?.whatsapp_status as WhatsAppStatus;
          if (newStatus) setStatus(newStatus);
          // Update provider based on meta_waba_id presence
          if (payload.new?.meta_waba_id) {
            setProvider("meta");
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { status, provider };
};
