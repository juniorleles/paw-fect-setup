import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[REACTIVATION] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("User authenticated", { userId: user.id });

    const { recipients, messageTemplate, instanceName } = await req.json();

    // recipients: Array<{ phone, name, lastService, daysInactive }>
    if (!recipients?.length || !messageTemplate || !instanceName) {
      return new Response(JSON.stringify({ error: "Dados incompletos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Validate subscription plan
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("plan, status, trial_messages_used, trial_messages_limit")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || sub.status !== "active") {
      return new Response(JSON.stringify({ error: "Assinatura inativa" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPaidPlan = sub.plan === "starter" || sub.plan === "professional";
    if (!isPaidPlan) {
      return new Response(JSON.stringify({ error: "Recurso disponível apenas para planos pagos" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Plan validated", { plan: sub.plan });

    // 2. Check message limit
    const remainingMessages = sub.trial_messages_limit - sub.trial_messages_used;
    if (remainingMessages < recipients.length) {
      return new Response(JSON.stringify({ 
        error: `Limite de mensagens insuficiente. Restam ${remainingMessages}, necessário ${recipients.length}.` 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Check monthly campaign limit
    const month = new Date().toISOString().slice(0, 7);
    const { count: campaignCount } = await adminClient
      .from("inactive_campaign_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("campaign_month", month);

    const campaignLimit = sub.plan === "professional" ? 999 : 1;
    if ((campaignCount ?? 0) >= campaignLimit) {
      return new Response(JSON.stringify({ error: "Limite de campanhas mensais atingido" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Limits validated", { remainingMessages, campaignCount, campaignLimit });

    // 4. Send messages via Evolution API
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    const results: { phone: string; success: boolean; error?: string }[] = [];
    const campaignLogs: any[] = [];

    for (const recipient of recipients) {
      const { phone, name, lastService, daysInactive } = recipient;

      // Replace template variables
      const finalMessage = messageTemplate
        .replace(/\{\{nome\}\}/gi, name || "")
        .replace(/\{\{ultimo_servico\}\}/gi, lastService || "")
        .replace(/\{\{dias_sem_voltar\}\}/gi, String(daysInactive || ""));

      let formattedPhone = phone.replace(/\D/g, "");
      if (!formattedPhone.startsWith("55")) {
        formattedPhone = "55" + formattedPhone;
      }

      try {
        const evoResponse = await fetch(
          `${evolutionUrl}/message/sendText/${instanceName}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionKey!,
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: finalMessage,
            }),
          }
        );

        if (!evoResponse.ok) {
          const errText = await evoResponse.text();
          logStep("Evolution API error for recipient", { phone, error: errText });
          results.push({ phone, success: false, error: "Falha no envio" });
          continue;
        }

        await evoResponse.text(); // consume body

        // Increment message counter
        await adminClient.rpc("increment_trial_messages", { p_user_id: user.id });

        results.push({ phone, success: true });

        campaignLogs.push({
          user_id: user.id,
          customer_phone: phone,
          customer_name: name,
          last_service: lastService,
          days_inactive: daysInactive,
          message_sent: finalMessage,
          campaign_month: month,
          campaign_type: "INACTIVE_RECOVERY",
        });

        logStep("Message sent", { phone });
      } catch (e) {
        logStep("Send error", { phone, error: e.message });
        results.push({ phone, success: false, error: e.message });
      }
    }

    // 5. Save campaign logs
    if (campaignLogs.length > 0) {
      // Use service role to insert since RLS requires auth.uid() = user_id
      await adminClient.from("inactive_campaign_logs").insert(campaignLogs);
    }

    const successCount = results.filter(r => r.success).length;
    logStep("Campaign completed", { total: recipients.length, success: successCount });

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount, 
      failed: recipients.length - successCount,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logStep("ERROR", { message: e.message });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
