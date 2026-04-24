import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Build a stable, safe instance name from the user's UUID
function buildInstanceName(userId: string): string {
  return `magiczap_${userId.replace(/-/g, "").substring(0, 16)}`;
}

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

    const evolutionUrl = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "";

    if (!evolutionUrl || !evolutionKey) {
      return new Response(JSON.stringify({ error: "Evolution API não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evoHeaders = {
      apikey: evolutionKey.trim(),
      "Content-Type": "application/json",
    };

    // Get current config to know the instance name (if any)
    const { data: existingConfig } = await serviceClient
      .from("pet_shop_configs")
      .select("evolution_instance_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const instanceName = existingConfig?.evolution_instance_name || buildInstanceName(user.id);

    // --- DISCONNECT: logout instance and clear DB fields ---
    if (isDisconnect) {
      try {
        await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
          method: "DELETE",
          headers: evoHeaders,
        });
      } catch (e) {
        console.warn("[DISCONNECT] Evolution logout error (non-fatal):", e);
      }

      await serviceClient
        .from("pet_shop_configs")
        .update({
          whatsapp_status: "disconnected",
          // Clear Meta fields too (legacy)
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

    // --- CREATE OR REUSE EVOLUTION INSTANCE + GET QR CODE ---
    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;

    // 1. Check if instance already exists
    const stateRes = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: evoHeaders,
    });

    let needsCreate = false;
    if (stateRes.status === 404) {
      needsCreate = true;
    } else if (stateRes.ok) {
      const stateData = await stateRes.json();
      const evoState = stateData?.instance?.state || stateData?.state || "unknown";
      // If already connected, just sync status and return
      if (evoState === "open" || evoState === "connected") {
        await serviceClient
          .from("pet_shop_configs")
          .update({
            whatsapp_status: "connected",
            evolution_instance_name: instanceName,
          })
          .eq("user_id", user.id);
        return new Response(
          JSON.stringify({ success: true, status: "connected", instance: instanceName }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Create instance if needed (Evolution API v2 syntax)
    if (needsCreate) {
      const createRes = await fetch(`${evolutionUrl}/instance/create`, {
        method: "POST",
        headers: evoHeaders,
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: {
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: [
              "QRCODE_UPDATED",
              "CONNECTION_UPDATE",
              "MESSAGES_UPSERT",
            ],
          },
        }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.text();
        console.error("[CREATE] Evolution error:", createRes.status, errBody);
        return new Response(
          JSON.stringify({ error: "Erro ao criar instância", details: errBody }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const createData = await createRes.json();
      const qrFromCreate = createData?.qrcode?.base64 || createData?.qrcode?.code || createData?.base64;

      // Persist instance name + pending status
      await serviceClient
        .from("pet_shop_configs")
        .update({
          whatsapp_status: "pending",
          evolution_instance_name: instanceName,
        })
        .eq("user_id", user.id);

      if (qrFromCreate) {
        return new Response(
          JSON.stringify({
            success: true,
            status: "pending",
            instance: instanceName,
            qrcode: qrFromCreate,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Fetch QR code (instance exists but not connected)
    const qrRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: evoHeaders,
    });

    if (!qrRes.ok) {
      const errBody = await qrRes.text();
      console.error("[QR] Evolution error:", qrRes.status, errBody);
      return new Response(
        JSON.stringify({ error: "Erro ao obter QR Code", details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const qrData = await qrRes.json();
    const qrcode = qrData?.base64 || qrData?.qrcode?.base64 || qrData?.code;

    await serviceClient
      .from("pet_shop_configs")
      .update({
        whatsapp_status: "pending",
        evolution_instance_name: instanceName,
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        status: "pending",
        instance: instanceName,
        qrcode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[reconnect-whatsapp] Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
