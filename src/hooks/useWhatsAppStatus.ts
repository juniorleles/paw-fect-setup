import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type WhatsAppStatus = "connected" | "disconnected" | "pending";

const SYNC_INTERVAL_MS = 60_000; // Sync every 60s

export const useWhatsAppStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus>("disconnected");

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

    // Sync periodically via Meta token validation
    const syncStatus = async () => {
      try {
        const { data } = await supabase.functions.invoke("sync-whatsapp-status", {
          method: "POST",
        });
        if (data?.status) {
          setStatus(data.status as WhatsAppStatus);
        }
      } catch {
        // Silent fail — DB realtime will catch up
      }
    };

    const initialTimeout = setTimeout(syncStatus, 3000);
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
        }
      )
      .subscribe();

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { status, provider: "meta" as const };
};
