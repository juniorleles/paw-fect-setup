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

    // Find users whose trial expires TODAY (same calendar day)
    const expiringToday = (subs ?? []).filter((s) => {
      if (!s.trial_end_at) return false;
      const trialEndStr = new Date(s.trial_end_at).toISOString().split("T")[0];
      return trialEndStr === todayStr;
    });

    console.log(`[TRIAL-NOTIFY] Found ${expiringToday.length} trials expiring today (${todayStr})`);

    if (expiringToday.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No trials expiring today" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = expiringToday.map((s) => s.user_id);

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

    for (const sub of expiringToday) {
      const config = configMap.get(sub.user_id);
      if (!config) {
        console.log(`[TRIAL-NOTIFY] No config found for user ${sub.user_id}, skipping`);
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

      const message = `⚠️ *Aviso importante — ${config.shop_name}*\n\n` +
        `Seu período de teste gratuito *expira hoje*! 🕐\n\n` +
        `Para continuar usando o assistente de WhatsApp e não perder seus agendamentos, assine agora um dos nossos planos.\n\n` +
        `Acesse seu painel para escolher o plano ideal para você. 💙\n\n` +
        `Se tiver dúvidas, estamos aqui para ajudar!`;

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
          console.log(`[TRIAL-NOTIFY] ✅ Notification sent to ${config.shop_name} (${phone})`);
          sent++;

          // Log to admin_error_logs for visibility
          await serviceClient.from("admin_error_logs").insert({
            error_message: `[TRIAL-NOTIFY] Notificação de expiração enviada para ${config.shop_name}`,
            endpoint: "trial-expiry-notification",
            severity: "warning",
            user_id: sub.user_id,
          });
        } else {
          const errBody = await sendRes.text();
          console.error(`[TRIAL-NOTIFY] ❌ Failed for ${config.shop_name}: ${sendRes.status} - ${errBody}`);
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
        alert_type: "trial_expiry",
        severity: "info",
        message: `${sent} notificação(ões) de expiração de trial enviada(s)`,
        details: { sent, errors, date: todayStr },
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
