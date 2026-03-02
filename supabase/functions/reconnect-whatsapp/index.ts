import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function requestPairingCode(
  baseUrl: string,
  instanceName: string,
  evoHeaders: Record<string, string>,
  userPhone: string,
  maxRetries = 5,
  delayMs = 3000
): Promise<{ pairingCode: string | null; qrBase64: string | null }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Pairing code attempt ${attempt}/${maxRetries} (delay ${delayMs}ms)`);
    await new Promise((r) => setTimeout(r, delayMs));

    const connectUrl = `${baseUrl}/instance/connect/${instanceName}?number=${userPhone}`;
    const connectRes = await fetch(connectUrl, {
      method: "GET",
      headers: evoHeaders,
    });
    const connectData = await connectRes.json();
    console.log(`Attempt ${attempt} response:`, JSON.stringify({
      pairingCode: connectData?.pairingCode,
      hasBase64: !!(connectData?.base64 || connectData?.qrcode?.base64),
    }));

    const pairingCode = connectData?.pairingCode || null;
    if (pairingCode) {
      return { pairingCode, qrBase64: null };
    }

    // Increase delay for next attempt
    delayMs = Math.min(delayMs + 1000, 6000);
  }

  // Final attempt - get whatever is available (QR fallback)
  const fallbackRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
    method: "GET",
    headers: evoHeaders,
  });
  const fallbackData = await fallbackRes.json();
  const qrBase64 = fallbackData?.base64 || fallbackData?.qrcode?.base64 || null;
  return { pairingCode: null, qrBase64 };
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
    let isMobile = false;
    let isDisconnect = false;
    try {
      const body = await req.json();
      isMobile = body?.mobile === true;
      isDisconnect = body?.disconnect === true;
    } catch { /* no body or invalid json */ }

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      return new Response(JSON.stringify({ error: "Evolution API não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- SUBSCRIPTION VERIFICATION (before any Evolution API calls) ---
    // Disconnect is always allowed (user should be able to disconnect even without subscription)
    if (!isDisconnect) {
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
          // Trial user — check quotas
          const aptsUsed = subscription.trial_appointments_used ?? 0;
          const msgsUsed = subscription.trial_messages_used ?? 0;
          const aptsLimit = subscription.trial_appointments_limit ?? 50;
          const msgsLimit = subscription.trial_messages_limit ?? 250;

          if (aptsUsed >= aptsLimit || msgsUsed >= msgsLimit) {
            blockReason = "Suas cotas de teste foram esgotadas. Atualize para um plano pago para continuar usando o WhatsApp.";
            console.log(`[RECONNECT-BLOCK] Trial quota exhausted for ${user.id}: apts=${aptsUsed}/${aptsLimit}, msgs=${msgsUsed}/${msgsLimit}`);
          }
        }
      } else if (subscription.status !== "active") {
        blockReason = "Sua assinatura não está ativa. Verifique seu plano para reconectar o WhatsApp.";
      }

      if (blockReason) {
        console.log(`[RECONNECT-BLOCK] Blocked instance creation for ${user.id}: ${blockReason}`);
        return new Response(JSON.stringify({ error: blockReason, blocked: true }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const instanceName = `user_${user.id.replace(/-/g, "").substring(0, 16)}`;
    const baseUrl = evolutionUrl.replace(/\/+$/, "");
    const evoHeaders: Record<string, string> = {
      apikey: evolutionKey.trim(),
      "Content-Type": "application/json",
    };

    // Handle disconnect
    if (isDisconnect) {
      try {
        await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
          method: "DELETE",
          headers: evoHeaders,
        });
      } catch { /* instance might not exist */ }
      try {
        await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
          method: "DELETE",
          headers: evoHeaders,
        });
      } catch { /* ignore */ }

      await serviceClient
        .from("pet_shop_configs")
        .update({ whatsapp_status: "disconnected" })
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user phone for pairing code
    const { data: config } = await serviceClient
      .from("pet_shop_configs")
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle();

    let userPhone = config?.phone?.replace(/\D/g, "") || null;
    if (userPhone && !userPhone.startsWith("55")) {
      userPhone = "55" + userPhone;
    }

    // Delete existing instance for a clean state
    try {
      await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: evoHeaders,
      });
    } catch { /* instance might not exist */ }

    await new Promise((r) => setTimeout(r, 1500));

    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;

    // For mobile: create WITHOUT qrcode to allow pairing code generation
    // For desktop: create WITH qrcode for immediate QR
    const createBody: Record<string, unknown> = {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: !isMobile, // false for mobile, true for desktop
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ["CONNECTION_UPDATE", "MESSAGES_UPSERT", "QRCODE_UPDATED"],
      },
    };

    console.log("Creating instance with body:", JSON.stringify(createBody));

    const createRes = await fetch(`${baseUrl}/instance/create`, {
      method: "POST",
      headers: evoHeaders,
      body: JSON.stringify(createBody),
    });

    const createData = await createRes.json();
    console.log("Create instance response status:", createRes.status);

    // Update status to pending
    await serviceClient
      .from("pet_shop_configs")
      .update({ whatsapp_status: "pending" })
      .eq("user_id", user.id);

    // For mobile, request pairing code with retry logic
    if (isMobile && userPhone) {
      const { pairingCode, qrBase64 } = await requestPairingCode(
        baseUrl, instanceName, evoHeaders, userPhone, 5, 3000
      );

      if (pairingCode) {
        return new Response(
          JSON.stringify({ success: true, pairingCode, mode: "pairing" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback to QR
      return new Response(
        JSON.stringify({
          success: true,
          qrCode: qrBase64,
          mode: "qr",
          note: "Pairing code not available after retries, showing QR",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For desktop, get QR code from connect
    await new Promise((r) => setTimeout(r, 2000));
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: evoHeaders,
    });
    const connectData = await connectRes.json();
    console.log("Connect response:", JSON.stringify({ hasBase64: !!connectData?.base64 }));

    const qrBase64 = connectData?.base64 || connectData?.qrcode?.base64 || null;

    return new Response(
      JSON.stringify({ success: true, qrCode: qrBase64, mode: "qr" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
