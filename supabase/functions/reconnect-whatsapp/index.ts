import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let isDisconnect = false;
    try {
      const body = await req.json();
      isDisconnect = body?.disconnect === true;
    } catch { /* no body */ }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle disconnect — clear Meta fields
    if (isDisconnect) {
      await serviceClient
        .from("pet_shop_configs")
        .update({
          whatsapp_status: "disconnected",
          meta_waba_id: null,
          meta_phone_number_id: null,
          meta_access_token: null,
        })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SUBSCRIPTION VERIFICATION ---
    const { data: subscription } = await serviceClient
      .from("subscriptions")
      .select("status, trial_end_at, current_period_end, trial_appointments_used, trial_messages_used, trial_appointments_limit, trial_messages_limit")
      .eq("user_id", user.id)
      .maybeSingle();

    let blockReason: string | null = null;

    if (!subscription) {
      blockReason = "Você precisa de uma assinatura ativa para conectar o WhatsApp. Assine um plano para começar.";
    } else if (subscription.status === "cancelled") {
      blockReason = "Sua assinatura foi cancelada. Reative seu plano para reconectar o WhatsApp.";
    } else if (subscription.status === "active") {
      const trialEnd = subscription.trial_end_at ? new Date(subscription.trial_end_at) : null;
      const hasPaidPeriod = subscription.current_period_end && trialEnd && new Date(subscription.current_period_end) > trialEnd;

      if (!hasPaidPeriod) {
        const aptsUsed = subscription.trial_appointments_used ?? 0;
        const msgsUsed = subscription.trial_messages_used ?? 0;
        const aptsLimit = subscription.trial_appointments_limit ?? 30;
        const msgsLimit = subscription.trial_messages_limit ?? 150;

        if (aptsUsed >= aptsLimit || msgsUsed >= msgsLimit) {
          blockReason = "Suas cotas de teste foram esgotadas. Atualize para um plano pago para continuar usando o WhatsApp.";
        }
      }
    } else if (subscription.status !== "active") {
      blockReason = "Sua assinatura não está ativa. Verifique seu plano para reconectar o WhatsApp.";
    }

    if (blockReason) {
      return new Response(JSON.stringify({ error: blockReason, blocked: true }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For Meta Cloud API, the connection is done via Embedded Signup on the frontend.
    // This endpoint now just validates the subscription and returns success,
    // signaling the frontend to launch the Meta Embedded Signup flow.
    return new Response(
      JSON.stringify({ success: true, provider: "meta", action: "launch_embedded_signup" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
