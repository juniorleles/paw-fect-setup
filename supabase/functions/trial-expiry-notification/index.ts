import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      console.error("Missing EVOLUTION_API_URL or EVOLUTION_API_KEY");
      return new Response(JSON.stringify({ error: "Missing Evolution config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active subscriptions with trial_end_at
    const { data: subs, error: subsError } = await serviceClient
      .from("subscriptions")
      .select("user_id, trial_end_at, status")
      .eq("status", "active")
      .not("trial_end_at", "is", null);

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError.message);
      return new Response(JSON.stringify({ error: subsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Calculate date 2 days from now
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const warningDateStr = twoDaysFromNow.toISOString().split("T")[0];

    // Categorize users: expiring today OR expiring in 2 days (warning)
    const expiringToday: typeof subs = [];
    const expiringWarning: typeof subs = [];

    for (const s of subs ?? []) {
      if (!s.trial_end_at) continue;
      const trialEndStr = new Date(s.trial_end_at).toISOString().split("T")[0];
      if (trialEndStr === todayStr) expiringToday.push(s);
      else if (trialEndStr === warningDateStr) expiringWarning.push(s);
    }

    console.log(`[TRIAL-NOTIFY] Found ${expiringToday.length} expiring today, ${expiringWarning.length} expiring in 2 days (${todayStr})`);

    const allTargets = [
      ...expiringToday.map((s) => ({ ...s, notificationType: "expiry" as const })),
      ...expiringWarning.map((s) => ({ ...s, notificationType: "warning" as const })),
    ];

    if (allTargets.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No trials to notify" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = allTargets.map((s) => s.user_id);

    // Get shop configs for these users (need instance name and phone)
    const { data: configs } = await serviceClient
      .from("pet_shop_configs")
      .select("user_id, evolution_instance_name, phone, shop_name, whatsapp_status")
      .in("user_id", userIds);

    const configMap = new Map(
      (configs ?? []).map((c) => [c.user_id, c])
    );

    let sent = 0;
    let errors = 0;
    const baseUrl = evolutionUrl.replace(/\/+$/, "");

    for (const target of allTargets) {
      const config = configMap.get(target.user_id);
      if (!config) {
        console.log(`[TRIAL-NOTIFY] No config found for user ${target.user_id}, skipping`);
        continue;
      }

      if (config.whatsapp_status !== "connected") {
        console.log(`[TRIAL-NOTIFY] WhatsApp not connected for ${config.shop_name}, skipping`);
        continue;
      }

      if (!config.phone) {
        console.log(`[TRIAL-NOTIFY] No phone for ${config.shop_name}, skipping`);
        continue;
      }

      const message = target.notificationType === "warning"
        ? `👋 *Olá, ${config.shop_name}!*\n\n` +
          `Seu período de teste gratuito termina em *2 dias*! ⏳\n\n` +
          `Está gostando do assistente? Para não perder o acesso, aproveite para assinar um dos nossos planos antes que o trial acabe.\n\n` +
          `Acesse seu painel para ver as opções. 💙`
        : `⚠️ *Aviso importante — ${config.shop_name}*\n\n` +
          `Seu período de teste gratuito *expira hoje*! 🕐\n\n` +
          `Para continuar usando o assistente de WhatsApp e não perder seus agendamentos, assine agora um dos nossos planos.\n\n` +
          `Acesse seu painel para escolher o plano ideal para você. 💙\n\n` +
          `Se tiver dúvidas, estamos aqui para ajudar!`;

      const logLabel = target.notificationType === "warning" ? "TRIAL-WARNING" : "TRIAL-EXPIRY";

      try {
        const phone = config.phone.replace(/\D/g, "");
        const sendRes = await fetch(
          `${baseUrl}/message/sendText/${config.evolution_instance_name}`,
          {
            method: "POST",
            headers: {
              apikey: evolutionKey.trim(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ number: phone, text: message }),
          }
        );

        if (sendRes.ok) {
          console.log(`[TRIAL-NOTIFY] ✅ [${logLabel}] Sent to ${config.shop_name} (${phone})`);
          sent++;

          await serviceClient.from("admin_error_logs").insert({
            error_message: `[${logLabel}] Notificação enviada para ${config.shop_name}`,
            endpoint: "trial-expiry-notification",
            severity: "warning",
            user_id: target.user_id,
          });
        } else {
          const errBody = await sendRes.text();
          console.error(`[TRIAL-NOTIFY] ❌ [${logLabel}] Failed for ${config.shop_name}: ${sendRes.status} - ${errBody}`);
          errors++;
        }
      } catch (err) {
        console.error(`[TRIAL-NOTIFY] Error sending to ${config.shop_name}:`, err);
        errors++;
      }
    }

    // Create system alert summary
    if (sent > 0) {
      await serviceClient.from("system_alerts").insert({
        alert_type: "trial_notification",
        severity: "info",
        message: `${sent} notificação(ões) de trial enviada(s)`,
        details: { sent, errors, date: todayStr, warnings: expiringWarning.length, expiries: expiringToday.length },
      });
    }

    console.log(`[TRIAL-NOTIFY] Complete: ${sent} sent, ${errors} errors`);

    return new Response(JSON.stringify({ sent, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[TRIAL-NOTIFY] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
