import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const NOTIFICATION_SOUND_FREQ = 880;
const NOTIFICATION_SOUND_DURATION = 0.15;

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(NOTIFICATION_SOUND_FREQ, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + NOTIFICATION_SOUND_DURATION * 2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + NOTIFICATION_SOUND_DURATION * 2);

    // Second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + NOTIFICATION_SOUND_DURATION * 2.5);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + NOTIFICATION_SOUND_DURATION * 2.5);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + NOTIFICATION_SOUND_DURATION * 4.5);
    osc2.start(ctx.currentTime + NOTIFICATION_SOUND_DURATION * 2.5);
    osc2.stop(ctx.currentTime + NOTIFICATION_SOUND_DURATION * 4.5);
  } catch {
    // Audio not supported
  }
}

function showBrowserNotification(petName: string, service: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("🐾 Novo Agendamento!", {
      body: `${petName} — ${service}`,
      icon: "/favicon.ico",
    });
  }
}

export const useAppointmentNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const initializedRef = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Skip the first render to avoid notifications for existing data
    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    const channel = supabase
      .channel("new-appointments")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const apt = payload.new;
          if (!apt) return;

          playNotificationSound();

          toast({
            title: "🐾 Novo Agendamento!",
            description: `${apt.pet_name} — ${apt.service} em ${apt.date} às ${apt.time?.slice(0, 5)}`,
          });

          showBrowserNotification(apt.pet_name, apt.service);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
};
