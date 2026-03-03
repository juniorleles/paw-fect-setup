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

function buildReminderMessage(
  config: PetShopConfig,
  appt: any
): string {
  const name = config.assistant_name || "Secretária";
  const clientName = appt.owner_name || "";
  const service = appt.service;
  const time = appt.time?.substring(0, 5) || appt.time; // HH:MM
  const shopName = config.shop_name;

  const tone = config.voice_tone || "friendly";

  if (tone === "formal") {
    return `Olá${clientName ? `, ${clientName}` : ""}! Aqui é a ${name} do ${shopName}. Seu horário de ${service} está agendado para amanhã às ${time}.\n\nResponda:\n1️⃣ CONFIRMO\n2️⃣ REMARCAR\n3️⃣ CANCELAR`;
  }

  if (tone === "fun") {
    return `Oii${clientName ? `, ${clientName}` : ""}! Aqui é a ${name} 😄 Lembrando que amanhã às ${time} tem ${service} no ${shopName}! Tá de pé?\n\nResponde:\n1️⃣ CONFIRMO\n2️⃣ REMARCAR\n3️⃣ CANCELAR 🐾`;
  }

  // friendly (default)
  return `Olá${clientName ? `, ${clientName}` : ""} 👋\nSeu horário na ${shopName} está agendado para amanhã às ${time}.\n\nResponda:\n1️⃣ Confirmar\n2️⃣ Reagendar\n3️⃣ Cancelar`;
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

    // Get current time in São Paulo timezone (BRT = UTC-3)
    const now = new Date();
    const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
    const nowBRT = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + BRT_OFFSET_MS);

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

    const nowTimeBR = brTimeFormatter.format(now);

    // 24h reminder window: appointments between 23h55min and 24h05min from now
    const minMinutes = 23 * 60 + 55; // 1435 minutes
    const maxMinutes = 24 * 60 + 5;  // 1445 minutes

    const minTime = new Date(now.getTime() + minMinutes * 60000);
    const maxTime = new Date(now.getTime() + maxMinutes * 60000);

    // Format target date and time window in BRT
    const targetDateMin = brFormatter.format(minTime);
    const targetDateMax = brFormatter.format(maxTime);
    const targetTimeMin = brTimeFormatter.format(minTime);
    const targetTimeMax = brTimeFormatter.format(maxTime);

    console.log(`Checking 24h reminders: now=${brFormatter.format(now)} ${nowTimeBR}`);
    console.log(`Window: ${targetDateMin} ${targetTimeMin} - ${targetDateMax} ${targetTimeMax}`);

    let allAppointments: any[] = [];

    if (targetDateMin === targetDateMax) {
      // Same day - simple query
      const { data, error } = await serviceClient
        .from("appointments")
        .select("*")
        .eq("date", targetDateMin)
        .gte("time", targetTimeMin)
        .lte("time", targetTimeMax)
        .in("status", ["pending", "confirmed"])
        .eq("reminder_24h_sent", false);

      if (error) {
        console.error("Error fetching appointments:", error);
        return new Response(JSON.stringify({ error: "DB error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      allAppointments = data || [];
    } else {
      // Crosses midnight - query both dates
      const { data: d1, error: e1 } = await serviceClient
        .from("appointments")
        .select("*")
        .eq("date", targetDateMin)
        .gte("time", targetTimeMin)
        .in("status", ["pending", "confirmed"])
        .eq("reminder_24h_sent", false);

      const { data: d2, error: e2 } = await serviceClient
        .from("appointments")
        .select("*")
        .eq("date", targetDateMax)
        .lte("time", targetTimeMax)
        .in("status", ["pending", "confirmed"])
        .eq("reminder_24h_sent", false);

      if (e1 || e2) {
        console.error("Error fetching appointments:", e1 || e2);
        return new Response(JSON.stringify({ error: "DB error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      allAppointments = [...(d1 || []), ...(d2 || [])];
    }

    if (allAppointments.length === 0) {
      console.log("No appointments need 24h reminders right now.");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${allAppointments.length} appointments needing 24h reminders`);

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    let sentCount = 0;
    const errors: string[] = [];

    // Group by user_id to load configs efficiently
    const userIds = [...new Set(allAppointments.map((a: any) => a.user_id))];

    for (const userId of userIds) {
      const { data: config } = await serviceClient
        .from("pet_shop_configs")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!config) {
        console.error(`No config for user ${userId}`);
        continue;
      }

      const shopConfig = config as PetShopConfig;

      // Check WhatsApp connection
      if (shopConfig.whatsapp_status !== "connected") {
        console.log(`WhatsApp disconnected for ${shopConfig.shop_name}, skipping. Will retry later.`);
        continue; // Don't mark as sent, will retry next cycle
      }

      const userAppts = allAppointments.filter((a: any) => a.user_id === userId);

      for (const appt of userAppts) {
        if (!appt.owner_phone) {
          console.log(`No phone for appointment ${appt.id}, skipping`);
          continue;
        }

        const message = buildReminderMessage(shopConfig, appt);

        try {
          if (evolutionUrl && evolutionKey) {
            const baseUrl = evolutionUrl.replace(/\/+$/, "");
            const phone = appt.owner_phone.replace(/\D/g, "");
            const sendRes = await fetch(
              `${baseUrl}/message/sendText/${shopConfig.evolution_instance_name}`,
              {
                method: "POST",
                headers: {
                  apikey: evolutionKey.trim(),
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ number: phone, text: message }),
              }
            );

            console.log(`24h reminder sent to ${phone} for appt ${appt.id}: status ${sendRes.status}`);

            if (sendRes.ok) {
              // Mark as sent (both fields for compatibility)
              await serviceClient
                .from("appointments")
                .update({
                  reminder_24h_sent: true,
                  confirmation_message_sent_at: new Date().toISOString(),
                })
                .eq("id", appt.id);
              sentCount++;
            } else {
              const errBody = await sendRes.text();
              errors.push(`Appt ${appt.id}: send failed (${sendRes.status}) - ${errBody}`);
            }
          }
        } catch (sendErr) {
          console.error(`Error sending reminder for appt ${appt.id}:`, sendErr);
          errors.push(`Appt ${appt.id}: ${String(sendErr)}`);
        }
      }
    }

    console.log(`24h reminders complete: ${sentCount} sent, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ sent: sentCount, errors: errors.length > 0 ? errors : undefined }),
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
