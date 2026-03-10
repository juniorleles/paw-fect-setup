import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[POST-SERVICE-UPSELL] ${step}${d}`);
};

/**
 * Pós-Atendimento com Upsell — Exclusive to Pro plan (professional)
 *
 * Sends a follow-up message ~24h after a completed appointment,
 * suggesting complementary services based on the original service.
 */

// Upsell map: service → suggested complementary services
const upsellMap: Record<string, string[]> = {
  // Barbershop
  "corte": ["barba", "sobrancelha", "hidratação capilar"],
  "corte degradê": ["barba", "sobrancelha", "pigmentação"],
  "corte infantil": ["sobrancelha"],
  "corte e barba": ["sobrancelha", "hidratação capilar", "pigmentação"],
  "barba": ["corte", "sobrancelha", "hidratação facial"],
  "sobrancelha": ["corte", "barba"],
  "pigmentação": ["corte", "barba"],
  "hidratação": ["corte", "barba"],
  "platinado": ["corte", "hidratação capilar"],
  "luzes": ["corte", "hidratação capilar"],
  // Generic/Salon
  "escova": ["hidratação", "cauterização"],
  "progressiva": ["corte", "hidratação"],
  "coloração": ["corte", "hidratação"],
  "manicure": ["pedicure"],
  "pedicure": ["manicure"],
  // Pet
  "banho": ["tosa higiênica", "hidratação de pelos"],
  "tosa": ["banho", "hidratação de pelos"],
  "banho e tosa": ["hidratação de pelos"],
};

const nicheEmoji: Record<string, string> = {
  barbearia: "💈",
  petshop: "🐶",
  veterinaria: "🩺",
  salao: "💇‍♀️",
  estetica: "✨",
  clinica: "🏥",
};

function getEmoji(niche: string): string {
  const key = (niche || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return nicheEmoji[key] || "✨";
}

function findUpsellSuggestions(service: string, availableServices: any[]): string[] {
  const normalized = (service || "").trim().toLowerCase();
  const availableNames = availableServices.map((s: any) => (s.name || "").trim().toLowerCase());

  // Try exact match first, then partial match
  let suggestions = upsellMap[normalized];
  if (!suggestions) {
    for (const [key, vals] of Object.entries(upsellMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        suggestions = vals;
        break;
      }
    }
  }

  if (!suggestions) return [];

  // Filter to only services actually offered by this business
  return suggestions.filter((s) =>
    availableNames.some((a) => a.includes(s) || s.includes(a))
  );
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

function buildUpsellMessage(
  clientName: string,
  service: string,
  suggestions: string[],
  shopName: string,
  niche: string,
  customTemplate?: string
): string {
  const emoji = getEmoji(niche);
  const name = clientName.split(" ")[0];

  const suggestionList = suggestions
    .map((s) => `• *${s.charAt(0).toUpperCase() + s.slice(1)}*`)
    .join("\n");

  const vars = {
    nome: name,
    servico: service,
    loja: shopName,
    sugestoes: suggestionList,
  };

  // Use custom template if provided
  if (customTemplate) {
    return applyTemplate(customTemplate, vars);
  }

  if (niche.toLowerCase().includes("barb")) {
    return [
      `E aí, ${name}! ${emoji}`,
      ``,
      `Curtiu o *${service}* de ontem aqui na *${shopName}*? Ficou show! 🔥`,
      ``,
      `Na próxima, que tal completar o visual com:`,
      suggestionList,
      ``,
      `Quer agendar? Me manda o dia e horário que fica melhor! 😎`,
    ].join("\n");
  }

  // Generic
  return [
    `Olá, ${name}! ${emoji}`,
    ``,
    `Esperamos que tenha gostado do *${service}* na *${shopName}*! 😊`,
    ``,
    `Para complementar, temos serviços que combinam muito:`,
    suggestionList,
    ``,
    `Quer agendar? Me envie o dia e horário preferido! 💜`,
  ].join("\n");
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

    // 1. Get all Pro plan users
    const { data: proSubs, error: subErr } = await supabase
      .from("subscriptions")
      .select("user_id, trial_messages_used, trial_messages_limit")
      .eq("plan", "professional")
      .eq("status", "active");

    if (subErr) throw subErr;
    if (!proSubs?.length) {
      log("No active Pro users");
      return new Response(
        JSON.stringify({ message: "No Pro users", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log(`Found ${proSubs.length} Pro users`);

    // Time window: completed appointments between 20h and 28h ago (targeting ~24h)
    const windowStart = new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
    const currentMonth = brtNow.toISOString().slice(0, 7);

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
        .select("shop_name, niche, evolution_instance_name, activated, services, campaign_messages")
        .eq("user_id", userId)
        .maybeSingle();

      if (!config?.evolution_instance_name || !config.activated) {
        log("Skipping user - no active instance", { userId });
        continue;
      }

      // Check if upsell campaign is enabled (default: disabled — must be explicitly true)
      const campaignMessages = (config as any).campaign_messages as Record<string, any> | undefined;
      if (campaignMessages?.upsell_enabled !== true) {
        log("Skipping user - upsell campaign not enabled", { userId });
        continue;
      }

      // Find completed appointments in the 24h window
      // We need appointments whose completion time was ~24h ago
      // Since we don't have a completed_at timestamp, we use date + time
      const yesterdayBRT = new Date(brtNow.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterdayBRT.toISOString().split("T")[0];

      const { data: completedAppts } = await supabase
        .from("appointments")
        .select("id, owner_name, owner_phone, service, date, time, notes")
        .eq("user_id", userId)
        .eq("status", "completed")
        .eq("date", yesterdayStr);

      if (!completedAppts?.length) continue;

      // Check which ones already received upsell (via campaign logs)
      const { data: sentLogs } = await supabase
        .from("inactive_campaign_logs")
        .select("customer_phone, campaign_type")
        .eq("user_id", userId)
        .eq("campaign_month", currentMonth)
        .eq("campaign_type", "POST_SERVICE_UPSELL");

      const sentPhones = new Set(
        (sentLogs || []).map((l) => l.customer_phone.replace(/\D/g, ""))
      );

      const services = (config.services as any[]) || [];
      let sentForUser = 0;

      for (const apt of completedAppts) {
        if (!apt.owner_phone) continue;

        const phone = apt.owner_phone.replace(/\D/g, "");
        if (sentPhones.has(phone)) continue; // Already sent this month
        if (sentForUser >= remaining) break;
        if (totalSent >= 30) break; // Daily cap

        // Find upsell suggestions
        const suggestions = findUpsellSuggestions(apt.service, services);
        if (suggestions.length === 0) {
          log("No upsell suggestions for service", { service: apt.service });
          totalSkipped++;
          continue;
        }

        const customUpsell = (config as any).campaign_messages?.upsell as string | undefined;
        const message = buildUpsellMessage(
          apt.owner_name,
          apt.service,
          suggestions.slice(0, 3),
          config.shop_name,
          config.niche,
          customUpsell
        );

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

          // Save to conversation_messages so the AI handler has context when client replies
          await supabase.from("conversation_messages").insert({
            user_id: userId,
            phone,
            role: "assistant",
            content: message,
          });

          // Log the campaign
          await supabase.from("inactive_campaign_logs").insert({
            user_id: userId,
            customer_phone: phone,
            customer_name: apt.owner_name,
            last_service: apt.service,
            days_inactive: 0,
            message_sent: message,
            campaign_month: currentMonth,
            campaign_type: "POST_SERVICE_UPSELL",
          });

          // Increment message counter
          await supabase.rpc("increment_trial_messages", { p_user_id: userId });

          sentForUser++;
          totalSent++;
          sentPhones.add(phone); // Prevent duplicates in same run
          log("Upsell sent", { phone, service: apt.service, suggestions });
        } catch (e) {
          log("Send error", { phone, error: e.message });
          totalSkipped++;
        }
      }

      log("User done", { userId, sent: sentForUser });
    }

    log("Campaign complete", { totalSent, totalSkipped });

    return new Response(
      JSON.stringify({ message: "Upsell complete", sent: totalSent, skipped: totalSkipped }),
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
