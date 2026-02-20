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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const instanceName = `user_${user.id.replace(/-/g, "").substring(0, 16)}`;

    // Check if instance already exists for this user
    const { data: existingConfig } = await serviceClient
      .from("pet_shop_configs")
      .select("evolution_instance_name, whatsapp_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingConfig?.whatsapp_status === "connected") {
      return new Response(
        JSON.stringify({ success: true, instance_name: existingConfig.evolution_instance_name, already_active: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create instance on Evolution API
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      return new Response(JSON.stringify({ error: "Evolution API não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = evolutionUrl.replace(/\/+$/, "");
    const evoHeaders: Record<string, string> = {
      apikey: evolutionKey.trim(),
      "Content-Type": "application/json",
    };

    console.log(`Creating Evolution instance: ${instanceName}`);
    const createRes = await fetch(`${baseUrl}/instance/create`, {
      method: "POST",
      headers: evoHeaders,
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
    });

    const createBody = await createRes.text();
    console.log("Evolution create response:", createRes.status, createBody);

    let qrCode = null;
    let pairingCode = null;

    if (createRes.ok) {
      try {
        const parsed = JSON.parse(createBody);
        qrCode = parsed?.qrcode?.base64 || parsed?.qrcode?.code || null;
        pairingCode = parsed?.qrcode?.pairingCode || null;
      } catch { /* ignore parse errors */ }
    } else if (createRes.status === 409 || createBody.includes("already")) {
      // Instance exists, try to connect
      console.log("Instance already exists, trying to connect...");
      const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: evoHeaders,
      });
      const connectBody = await connectRes.text();
      console.log("Evolution connect response:", connectRes.status, connectBody);
      
      if (connectRes.ok) {
        try {
          const parsed = JSON.parse(connectBody);
          qrCode = parsed?.base64 || parsed?.code || null;
          pairingCode = parsed?.pairingCode || null;
        } catch { /* ignore */ }
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Erro ao criar instância na Evolution API", details: createBody }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Register webhook for connection status updates
    const supabaseProjectUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseProjectUrl}/functions/v1/evolution-webhook`;
    try {
      const webhookRes = await fetch(`${baseUrl}/webhook/instance`, {
        method: "POST",
        headers: evoHeaders,
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: ["CONNECTION_UPDATE", "QRCODE_UPDATED"],
          instanceName,
        }),
      });
      console.log("Webhook registration:", webhookRes.status, await webhookRes.text());
    } catch (whErr) {
      console.error("Webhook registration error:", whErr);
    }

    // Update database with instance name
    await serviceClient
      .from("pet_shop_configs")
      .update({
        evolution_instance_name: instanceName,
        whatsapp_status: "pending",
      })
      .eq("user_id", user.id);

    // Create or update subscription
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingSub) {
      await supabase.from("subscriptions").insert({ user_id: user.id, status: "active" });
    } else if (existingSub.status !== "active") {
      await supabase
        .from("subscriptions")
        .update({ status: "active", cancelled_at: null })
        .eq("id", existingSub.id);
    }

    // Log
    await supabase.from("subscription_logs").insert({
      user_id: user.id,
      action: "activate",
      details: { instance_name: instanceName, created_at: new Date().toISOString() },
    });

    return new Response(
      JSON.stringify({
        success: true,
        instance_name: instanceName,
        qr_code: qrCode,
        pairing_code: pairingCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Activate error:", err);
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
