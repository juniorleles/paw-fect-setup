import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PetShopConfig {
  user_id: string;
  shop_name: string;
  assistant_name: string;
  voice_tone: string;
  evolution_instance_name: string;
  whatsapp_status: string;
}

// ─── Quiet Hours: 22:00–08:00 BRT ───
// If a reminder would fire during quiet hours, reschedule to 09:00 BRT same day.
// Returns true if current BRT time is within the allowed sending window OR
// if we're at 09:00 and there are rescheduled reminders to send.
function isQuietHours(brHour: number): boolean {
  return brHour >= 22 || brHour < 8;
}

function buildReminder24hMessage(config: PetShopConfig, appt: any): string {
  const name = config.assistant_name || "Secretária";
  const clientName = appt.owner_name || "";
  const service = appt.service;
  const time = appt.time?.substring(0, 5) || appt.time;
  const shopName = config.shop_name;
  const tone = config.voice_tone || "friendly";

  if (tone === "formal") {
    return `Olá${clientName ? `, ${clientName}` : ""}! Aqui é a ${name} do ${shopName}. Seu horário de ${service} está agendado para amanhã às ${time}.\n\nResponda:\n1️⃣ CONFIRMO\n2️⃣ REMARCAR\n3️⃣ CANCELAR`;
  }
  if (tone === "fun") {
    return `Oii${clientName ? `, ${clientName}` : ""}! Aqui é a ${name} 😄 Lembrando que amanhã às ${time} tem ${service} no ${shopName}! Tá de pé?\n\nResponde:\n1️⃣ CONFIRMO\n2️⃣ REMARCAR\n3️⃣ CANCELAR 🐾`;
  }
  return `Olá${clientName ? `, ${clientName}` : ""} 👋\nSeu horário na ${shopName} está agendado para amanhã às ${time}.\n\nResponda:\n1️⃣ Confirmar\n2️⃣ Reagendar\n3️⃣ Cancelar`;
}

function buildReminder3hMessage(config: PetShopConfig, appt: any): string {
  const clientName = appt.owner_name || "";
  const time = appt.time?.substring(0, 5) || appt.time;
  const shopName = config.shop_name;
  const tone = config.voice_tone || "friendly";

  if (tone === "formal") {
    return `Olá${clientName ? `, ${clientName}` : ""}. Apenas um lembrete: seu horário é hoje às ${time} na ${shopName}. Aguardamos sua presença.`;
  }
  if (tone === "fun") {
    return `⏰ Ei${clientName ? `, ${clientName}` : ""}! Faltam poucas horas pro seu horário às ${time} na ${shopName}! Te esperamos 👊🔥`;
  }
  return `⏰ Lembrete rápido${clientName ? `, ${clientName}` : ""}!\nSeu horário é hoje às ${time} na ${shopName}.\nTe esperamos 👊`;
}

// Helper to query appointments in a BRT time window
async function queryAppointmentsInWindow(
  client: any,
  brFormatter: Intl.DateTimeFormat,
  brTimeFormatter: Intl.DateTimeFormat,
  now: Date,
  minutesAhead: number,
  windowHalf: number,
  sentField: string
) {
  const minTime = new Date(now.getTime() + (minutesAhead - windowHalf) * 60000);
  const maxTime = new Date(now.getTime() + (minutesAhead + windowHalf) * 60000);

  const targetDateMin = brFormatter.format(minTime);
  const targetDateMax = brFormatter.format(maxTime);
  const targetTimeMin = brTimeFormatter.format(minTime);
  const targetTimeMax = brTimeFormatter.format(maxTime);

  if (targetDateMin === targetDateMax) {
    const { data, error } = await client
      .from("appointments")
      .select("*")
      .eq("date", targetDateMin)
      .gte("time", targetTimeMin)
      .lte("time", targetTimeMax)
      .in("status", ["pending", "confirmed"])
      .eq(sentField, false);
    return { data: data || [], error };
  }

  // Crosses midnight
  const { data: d1, error: e1 } = await client
    .from("appointments")
    .select("*")
    .eq("date", targetDateMin)
    .gte("time", targetTimeMin)
    .in("status", ["pending", "confirmed"])
    .eq(sentField, false);

  const { data: d2, error: e2 } = await client
    .from("appointments")
    .select("*")
    .eq("date", targetDateMax)
    .lte("time", targetTimeMax)
    .in("status", ["pending", "confirmed"])
    .eq(sentField, false);

  return {
    data: [...(d1 || []), ...(d2 || [])],
    error: e1 || e2,
  };
}

// Query appointments whose reminders were rescheduled to 09:00 (quiet hours)
// These are appointments that fell in the quiet window and need sending now.
async function queryRescheduledReminders(
  client: any,
  sentField: string,
  reminderType: "24h" | "3h"
) {
  // Find appointments where reminder_rescheduled=true and the sent flag is still false
  // and the appointment hasn't been cancelled
  const { data, error } = await client
    .from("appointments")
    .select("*")
    .eq("reminder_rescheduled", true)
    .eq(sentField, false)
    .in("status", ["pending", "confirmed"]);

  return { data: data || [], error };
}

async function sendMessage(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  phone: string,
  text: string
): Promise<boolean> {
  const baseUrl = evolutionUrl.replace(/\/+$/, "");
  const cleanPhone = phone.replace(/\D/g, "");
  const res = await fetch(
    `${baseUrl}/message/sendText/${instanceName}`,
    {
      method: "POST",
      headers: {
        apikey: evolutionKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number: cleanPhone, text }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    console.error(`Send failed (${res.status}): ${body}`);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const brFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const brTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const brHourFormatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    });

    const nowTimeBR = brTimeFormatter.format(now);
    const currentBRHour = parseInt(brHourFormatter.format(now), 10);
    const currentBRMinute = parseInt(nowTimeBR.split(":")[1], 10);
    const inQuietHours = isQuietHours(currentBRHour);

    console.log(`Reminder check: ${brFormatter.format(now)} ${nowTimeBR} | Quiet hours: ${inQuietHours}`);

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      return new Response(JSON.stringify({ error: "Evolution API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent24h = 0;
    let sent3h = 0;
    let rescheduled = 0;
    const errors: string[] = [];

    // Cache configs and plans per user
    const configCache = new Map<string, PetShopConfig | null>();
    const planCache = new Map<string, string>();

    async function getConfig(userId: string): Promise<PetShopConfig | null> {
      if (configCache.has(userId)) return configCache.get(userId)!;
      const { data } = await serviceClient
        .from("pet_shop_configs")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      configCache.set(userId, data as PetShopConfig | null);
      return data as PetShopConfig | null;
    }

    async function getPlan(userId: string): Promise<string> {
      if (planCache.has(userId)) return planCache.get(userId)!;
      const { data } = await serviceClient
        .from("subscriptions")
        .select("plan")
        .eq("user_id", userId)
        .maybeSingle();
      const plan = data?.plan || "free";
      planCache.set(userId, plan);
      return plan;
    }

    // Helper: process a reminder (send or reschedule based on quiet hours)
    async function processReminder(
      appt: any,
      config: PetShopConfig,
      message: string,
      sentField: string,
      type: "24h" | "3h"
    ): Promise<"sent" | "rescheduled" | "error"> {
      // Calculate what BRT hour the reminder would fire at (now)
      if (inQuietHours) {
        // Don't send – mark as rescheduled for 09:00 delivery
        await serviceClient
          .from("appointments")
          .update({ reminder_rescheduled: true })
          .eq("id", appt.id);
        console.log(`${type} reminder for appt ${appt.id} rescheduled to 09:00 (quiet hours)`);
        return "rescheduled";
      }

      try {
        const ok = await sendMessage(
          evolutionUrl!, evolutionKey!,
          config.evolution_instance_name,
          appt.owner_phone, message
        );
        if (ok) {
          const updateData: Record<string, any> = { [sentField]: true };
          if (type === "24h") {
            updateData.confirmation_message_sent_at = new Date().toISOString();
          }
          // Reset rescheduled flag after successful send
          updateData.reminder_rescheduled = false;
          await serviceClient
            .from("appointments")
            .update(updateData)
            .eq("id", appt.id);
          console.log(`${type} reminder sent for appt ${appt.id}`);
          return "sent";
        }
        return "error";
      } catch (e) {
        errors.push(`${type} appt ${appt.id}: ${String(e)}`);
        return "error";
      }
    }

    // ─── PROCESS RESCHEDULED REMINDERS (at 09:00 BRT window: 08:55–09:05) ───
    const isRescheduleWindow = currentBRHour === 9 && currentBRMinute <= 5 ||
                               currentBRHour === 8 && currentBRMinute >= 55;

    if (isRescheduleWindow) {
      console.log("Processing rescheduled reminders (09:00 window)");

      // 24h rescheduled
      const { data: rescheduled24h } = await queryRescheduledReminders(
        serviceClient, "reminder_24h_sent", "24h"
      );
      for (const appt of rescheduled24h) {
        const config = await getConfig(appt.user_id);
        if (!config || config.whatsapp_status !== "connected" || !appt.owner_phone) continue;
        const message = buildReminder24hMessage(config, appt);
        const result = await processReminder(appt, config, message, "reminder_24h_sent", "24h");
        if (result === "sent") sent24h++;
      }

      // 3h rescheduled (only paid plans)
      const { data: rescheduled3h } = await queryRescheduledReminders(
        serviceClient, "reminder_3h_sent", "3h"
      );
      for (const appt of rescheduled3h) {
        const plan = await getPlan(appt.user_id);
        if (plan === "free") continue;
        const config = await getConfig(appt.user_id);
        if (!config || config.whatsapp_status !== "connected" || !appt.owner_phone) continue;
        const message = buildReminder3hMessage(config, appt);
        const result = await processReminder(appt, config, message, "reminder_3h_sent", "3h");
        if (result === "sent") sent3h++;
      }
    }

    // ─── 24h REMINDERS (all plans) ───
    const { data: appts24h, error: err24h } = await queryAppointmentsInWindow(
      serviceClient, brFormatter, brTimeFormatter, now,
      24 * 60, 5, "reminder_24h_sent"
    );

    if (err24h) {
      console.error("Error fetching 24h appointments:", err24h);
    } else if (appts24h.length > 0) {
      console.log(`Found ${appts24h.length} appointments for 24h reminder`);
      for (const appt of appts24h) {
        const config = await getConfig(appt.user_id);
        if (!config || config.whatsapp_status !== "connected" || !appt.owner_phone) continue;

        const message = buildReminder24hMessage(config, appt);
        const result = await processReminder(appt, config, message, "reminder_24h_sent", "24h");
        if (result === "sent") sent24h++;
        if (result === "rescheduled") rescheduled++;
      }
    }

    // ─── 3h REMINDERS (Essencial & Pro only) ───
    const { data: appts3h, error: err3h } = await queryAppointmentsInWindow(
      serviceClient, brFormatter, brTimeFormatter, now,
      3 * 60, 5, "reminder_3h_sent"
    );

    if (err3h) {
      console.error("Error fetching 3h appointments:", err3h);
    } else if (appts3h.length > 0) {
      console.log(`Found ${appts3h.length} candidates for 3h reminder`);
      for (const appt of appts3h) {
        const plan = await getPlan(appt.user_id);
        if (plan === "starter") {
          console.log(`Skipping 3h reminder for appt ${appt.id} (Free plan)`);
          continue;
        }
        const config = await getConfig(appt.user_id);
        if (!config || config.whatsapp_status !== "connected" || !appt.owner_phone) continue;

        const message = buildReminder3hMessage(config, appt);
        const result = await processReminder(appt, config, message, "reminder_3h_sent", "3h");
        if (result === "sent") sent3h++;
        if (result === "rescheduled") rescheduled++;
      }
    }

    console.log(`Reminders done: 24h=${sent24h}, 3h=${sent3h}, rescheduled=${rescheduled}, errors=${errors.length}`);

    return new Response(
      JSON.stringify({
        sent_24h: sent24h,
        sent_3h: sent3h,
        rescheduled,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
