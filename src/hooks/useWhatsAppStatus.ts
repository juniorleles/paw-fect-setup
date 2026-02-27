import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type WhatsAppStatus = "connected" | "disconnected" | "pending";

const SYNC_INTERVAL_MS = 60_000; // Sync with Evolution API every 60s

export const useWhatsAppStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus>("disconnected");
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    // Fetch initial status from DB
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("pet_shop_configs")
        .select("whatsapp_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.whatsapp_status) {
        setStatus(data.whatsapp_status as WhatsAppStatus);
      }
    };
    fetchStatus();

    // Sync with Evolution API periodically
    const syncWithEvolution = async () => {
      try {
        const { data } = await supabase.functions.invoke("sync-whatsapp-status", {
          method: "POST",
        });
        if (data?.status) {
          setStatus(data.status as WhatsAppStatus);
        }
        lastSyncRef.current = Date.now();
      } catch {
        // Silent fail — DB realtime will catch up
      }
    };

    // Initial sync after a short delay
    const initialTimeout = setTimeout(syncWithEvolution, 3000);

    // Periodic sync
    const interval = setInterval(syncWithEvolution, SYNC_INTERVAL_MS);

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
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return status;
};
