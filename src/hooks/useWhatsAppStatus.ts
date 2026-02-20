import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type WhatsAppStatus = "connected" | "disconnected" | "pending";

export const useWhatsAppStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus>("disconnected");

  useEffect(() => {
    if (!user) return;

    // Fetch initial status
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
      supabase.removeChannel(channel);
    };
  }, [user]);

  return status;
};
