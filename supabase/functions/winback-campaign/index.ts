import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[WINBACK] ${step}${d}`);
};

/**
 * Win-back Progressivo — Exclusive to Pro plan (professional)
 * 
 * Stages:
 *   WINBACK_15 → 15+ days inactive
 *   WINBACK_30 → 30+ days inactive
 *   WINBACK_60 → 60+ days inactive
 * 
 * Uses niche-aware messaging (barbershop / petshop / salon etc.)
 */

interface InactiveClient {
  owner_phone: string;
  owner_name: string;
  last_service: string;
  last_date: string;
  days_inactive: number;
}

const STAGES = [
  { type: "WINBACK_15", minDays: 15, maxDays: 29 },
  { type: "WINBACK_30", minDays: 30, maxDays: 59 },
  { type: "WINBACK_60", minDays: 60, maxDays: 9999 },
] as const;

// Niche-specific emoji maps
const nicheEmoji: Record<string, string> = {
  barbearia: "💈",
  petshop: "🐾",
  veterinaria: "🐾",
  salao: "💇‍♀️",
  estetica: "✨",
  clinica: "🏥",
};

function getEmoji(niche: string): string {
  const key = (niche || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return nicheEmoji[key] || "✨";
}

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, val);
  }
  return result;
}

function buildWinbackMessage(
  stage: string,
  clientName: string,
  lastService: string,
  daysInactive: number,
  shopName: string,
  niche: string,
  customTemplates?: Record<string, string>
): string {
  const emoji = getEmoji(niche);
  const name = clientName.split(" ")[0];

  const vars = {
    nome: name,
    servico: lastService,
    dias: String(daysInactive),
    loja: shopName,
  };

  // Check for custom template
  const templateKey = stage.toLowerCase(); // e.g. "winback_15"
  if (customTemplates && customTemplates[templateKey]) {
    return applyTemplate(customTemplates[templateKey], vars);
  }

  // Default messages
  if (niche.toLowerCase().includes("barb")) {
    switch (stage) {
      case "WINBACK_15":
        return [
          `E aí, ${name}! ${emoji}`,
          ``,
          `Faz ${daysInactive} dias desde o último *${lastService}* aqui na *${shopName}*. Tá na hora de dar aquele tapa no visual, né? 😎`,
          ``,
          `Quer agendar? É só me dizer o melhor dia e horário! ${emoji}`,
        ].join("\n");

      case "WINBACK_30":
        return [
          `Fala, ${name}! ${emoji}`,
          ``,
          `Sumiu, hein! Já faz ${daysInactive} dias que você não aparece aqui na *${shopName}*.`,
          ``,
          `Reservei um horário especial pra você voltar e ficar na régua. Quer marcar? Me manda o dia que fica melhor! 🔥`,
        ].join("\n");

      case "WINBACK_60":
        return [
          `${name}, saudade de você por aqui! ${emoji}`,
          ``,
          `Já faz mais de ${daysInactive} dias desde seu último *${lastService}* na *${shopName}*.`,
          ``,
          `Que tal voltar com um combo especial? Corte + barba com aquele precinho de cliente VIP! 💪`,
          ``,
          `Me chama pra agendar! ${emoji}`,
        ].join("\n");

      default:
        return "";
    }
  }

  switch (stage) {
    case "WINBACK_15":
      return [
        `Olá, ${name}! ${emoji}`,
        ``,
        `Faz ${daysInactive} dias desde o último *${lastService}* aqui na *${shopName}*. Sentimos sua falta!`,
        ``,
        `Quer agendar um novo horário? É só me dizer! 😊`,
      ].join("\n");

    case "WINBACK_30":
      return [
        `Oi, ${name}! ${emoji}`,
        ``,
        `Já faz ${daysInactive} dias que você não nos visita na *${shopName}*.`,
        ``,
        `Temos horários especiais disponíveis pra você! Quer marcar? Me conta o melhor dia 💜`,
      ].join("\n");

    case "WINBACK_60":
      return [
        `${name}, que saudade! ${emoji}`,
        ``,
        `Faz mais de ${daysInactive} dias desde seu último *${lastService}* na *${shopName}*.`,
        ``,
        `Preparamos uma oferta especial pra clientes VIP como você! Me chama pra agendar ${emoji}`,
      ].join("\n");

    default:
      return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      throw new Error("Evolution API credentials not configured");
    }

    // BRT Quiet Hours 22:00–08:00
    const now = new Date();
    const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const brtHour = brtNow.getUTCHours();

    if (brtHour >= 22 || brtHour < 8) {
      log("Quiet hours active, skipping", { brtHour });
      return new Response(
        JSON.stringify({ message: "Quiet hours - skipping" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get all Pro plan users with active subscriptions
    const { data: proSubs, error: subErr } = await supabase
      .from("subscriptions")
      .select("user_id, trial_messages_used, trial_messages_limit")
      .eq("plan", "professional")
      .eq("status", "active");

    if (subErr) throw subErr;
    if (!proSubs?.length) {
      log("No active Pro users found");
      return new Response(
        JSON.stringify({ message: "No Pro users", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log(`Found ${proSubs.length} Pro users`);

    const todayBRT = brtNow.toISOString().split("T")[0];
    const currentMonth = todayBRT.slice(0, 7);
    let totalSent = 0;
    let totalSkipped = 0;

    for (const sub of proSubs) {
      const userId = sub.user_id;

      // Check message budget
      const remaining = sub.trial_messages_limit === -1
        ? Infinity
        : sub.trial_messages_limit - sub.trial_messages_used;

      if (remaining < 1) {
        log("Skipping user - no messages left", { userId });
        continue;
      }

      // Get shop config
      const { data: config } = await supabase
        .from("pet_shop_configs")
        .select("shop_name, niche, evolution_instance_name, activated, campaign_messages")
        .eq("user_id", userId)
        .maybeSingle();

      if (!config?.evolution_instance_name || !config.activated) {
        log("Skipping user - no active instance", { userId });
        continue;
      }

      // Check if winback campaign is enabled (default: disabled — must be explicitly true)
      const campaignMessages = (config as any).campaign_messages as Record<string, any> | undefined;
      if (campaignMessages?.winback_enabled !== true) {
        log("Skipping user - winback campaign not enabled", { userId });
        continue;
      }

      // Find last completed appointment per unique client phone
      const { data: completedAppts } = await supabase
        .from("appointments")
        .select("owner_phone, owner_name, service, date")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("date", { ascending: false });

      if (!completedAppts?.length) continue;

      // Deduplicate by phone — keep most recent appointment
      const clientMap = new Map<string, InactiveClient>();
      for (const apt of completedAppts) {
        if (!apt.owner_phone) continue;
        const phone = apt.owner_phone.replace(/\D/g, "");
        if (clientMap.has(phone)) continue;

        const lastDate = new Date(apt.date);
        const diffMs = brtNow.getTime() - lastDate.getTime();
        const daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysInactive >= 15) {
          clientMap.set(phone, {
            owner_phone: phone,
            owner_name: apt.owner_name,
            last_service: apt.service,
            last_date: apt.date,
            days_inactive: daysInactive,
          });
        }
      }

      if (clientMap.size === 0) continue;

      // Check if client has a future appointment (exclude them)
      const { data: futureAppts } = await supabase
        .from("appointments")
        .select("owner_phone")
        .eq("user_id", userId)
        .gte("date", todayBRT)
        .neq("status", "cancelled")
        .neq("status", "no_show");

      const futurePhones = new Set(
        (futureAppts || []).map((a) => a.owner_phone?.replace(/\D/g, ""))
      );

      // Fetch already-sent winback logs for this month
      const { data: sentLogs } = await supabase
        .from("inactive_campaign_logs")
        .select("customer_phone, campaign_type")
        .eq("user_id", userId)
        .eq("campaign_month", currentMonth)
        .in("campaign_type", ["WINBACK_15", "WINBACK_30", "WINBACK_60"]);

      const sentSet = new Set(
        (sentLogs || []).map((l) => `${l.customer_phone.replace(/\D/g, "")}:${l.campaign_type}`)
      );

      let sentForUser = 0;

      for (const [phone, client] of clientMap) {
        if (futurePhones.has(phone)) continue;
        if (sentForUser + totalSent >= 50) break; // global daily cap

        // Determine which stage this client is in
        const stage = STAGES.find(
          (s) => client.days_inactive >= s.minDays && client.days_inactive <= s.maxDays
        );
        if (!stage) continue;

        // Check if already sent this stage this month
        const key = `${phone}:${stage.type}`;
        if (sentSet.has(key)) continue;

        // Check message budget
        if (sentForUser >= remaining) break;

        const customTemplates = (config as any).campaign_messages as Record<string, string> | undefined;
        const message = buildWinbackMessage(
          stage.type,
          client.owner_name,
          client.last_service,
          client.days_inactive,
          config.shop_name,
          config.niche,
          customTemplates
        );

        if (!message) continue;

        log("Message preview", { phone, stage: stage.type, message: message.substring(0, 120) });

        try {
          const evoResp = await fetch(
            `${evolutionUrl}/message/sendText/${config.evolution_instance_name}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: evolutionKey,
              },
              body: JSON.stringify({ number: phone, text: message }),
            }
          );

          if (!evoResp.ok) {
            const errText = await evoResp.text();
            log("Evolution error", { phone, error: errText });
            totalSkipped++;
            continue;
          }
          await evoResp.text();

          // Log the campaign
          await supabase.from("inactive_campaign_logs").insert({
            user_id: userId,
            customer_phone: phone,
            customer_name: client.owner_name,
            last_service: client.last_service,
            days_inactive: client.days_inactive,
            message_sent: message,
            campaign_month: currentMonth,
            campaign_type: stage.type,
          });

          // Increment message counter
          await supabase.rpc("increment_trial_messages", { p_user_id: userId });

          sentForUser++;
          totalSent++;
          log("Winback sent", { phone, stage: stage.type, days: client.days_inactive });
        } catch (e) {
          log("Send error", { phone, error: e.message });
          totalSkipped++;
        }
      }

      log("User done", { userId, sent: sentForUser });
    }

    log("Campaign complete", { totalSent, totalSkipped });

    return new Response(
      JSON.stringify({ message: "Winback complete", sent: totalSent, skipped: totalSkipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("Fatal error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
