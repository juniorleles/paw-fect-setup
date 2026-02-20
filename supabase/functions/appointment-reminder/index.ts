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

function buildConfirmationMessage(
  config: PetShopConfig,
  appt: any
): string {
  const name = config.assistant_name || "Secretária";
  const pet = appt.pet_name;
  const service = appt.service;
  const time = appt.time;
  const statusLabel = appt.status === "pending" ? " (⚠️ ainda não confirmado)" : "";

  const tone = config.voice_tone || "friendly";

  if (tone === "formal") {
    return `Olá${appt.owner_name ? `, ${appt.owner_name}` : ""}! Aqui é a ${name} do ${config.shop_name}. Seu agendamento de ${service} para ${pet} está marcado para hoje às ${time}${statusLabel}. Você confirma sua presença?\n\nResponda:\n✅ CONFIRMO\n📅 REMARCAR\n❌ CANCELAR`;
  }

  if (tone === "fun") {
    return `Oii${appt.owner_name ? `, ${appt.owner_name}` : ""}! Aqui é a ${name} 😄 Só confirmando: ${pet} tem ${service} hoje às ${time}${statusLabel}. Tá de pé?\n\nResponde:\n✅ CONFIRMO\n📅 REMARCAR\n❌ CANCELAR 🐾`;
  }

  // friendly (default)
  return `Oi${appt.owner_name ? `, ${appt.owner_name}` : ""}! Eu sou a ${name} 😊 Passando pra confirmar: o ${pet} tem ${service} hoje às ${time}${statusLabel}. Você confirma?\n\nResponda:\n✅ CONFIRMO\n📅 REMARCAR\n❌ CANCELAR`;
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

    // Get current time in São Paulo timezone
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

    const todayBR = brFormatter.format(now); // YYYY-MM-DD
    const nowTimeBR = brTimeFormatter.format(now); // HH:MM

    // Calculate the window: appointments between 55 and 65 minutes from now
    const minMinutes = 55;
    const maxMinutes = 65;

    const minTime = new Date(now.getTime() + minMinutes * 60000);
    const maxTime = new Date(now.getTime() + maxMinutes * 60000);

    const minTimeBR = brTimeFormatter.format(minTime);
    const maxTimeBR = brTimeFormatter.format(maxTime);

    console.log(`Checking reminders: now=${todayBR} ${nowTimeBR}, window=${minTimeBR}-${maxTimeBR}`);

    // Find appointments in the window that haven't had confirmation sent
    const { data: appointments, error: fetchErr } = await serviceClient
      .from("appointments")
      .select("*")
      .eq("date", todayBR)
      .gte("time", minTimeBR)
      .lte("time", maxTimeBR)
      .in("status", ["pending", "confirmed"])
      .is("confirmation_message_sent_at", null);

    if (fetchErr) {
      console.error("Error fetching appointments:", fetchErr);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!appointments || appointments.length === 0) {
      console.log("No appointments need reminders right now.");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${appointments.length} appointments needing reminders`);

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    let sentCount = 0;
    const errors: string[] = [];

    // Group by user_id to load configs efficiently
    const userIds = [...new Set(appointments.map((a: any) => a.user_id))];

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

      const userAppts = appointments.filter((a: any) => a.user_id === userId);

      for (const appt of userAppts) {
        if (!appt.owner_phone) {
          console.log(`No phone for appointment ${appt.id}, skipping`);
          continue;
        }

        const message = buildConfirmationMessage(shopConfig, appt);

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

            console.log(`Reminder sent to ${phone} for appt ${appt.id}: status ${sendRes.status}`);

            if (sendRes.ok) {
              // Mark as sent
              await serviceClient
                .from("appointments")
                .update({ confirmation_message_sent_at: new Date().toISOString() })
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

    console.log(`Reminders complete: ${sentCount} sent, ${errors.length} errors`);

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
