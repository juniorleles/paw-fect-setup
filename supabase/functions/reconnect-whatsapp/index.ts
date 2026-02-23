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

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionUrl || !evolutionKey) {
      return new Response(JSON.stringify({ error: "Evolution API não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instanceName = `user_${user.id.replace(/-/g, "").substring(0, 16)}`;
    const baseUrl = evolutionUrl.replace(/\/+$/, "");
    const evoHeaders: Record<string, string> = {
      apikey: evolutionKey.trim(),
      "Content-Type": "application/json",
    };

    // Fetch user phone for pairing code
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: config } = await serviceClient
      .from("pet_shop_configs")
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle();

    const userPhone = config?.phone?.replace(/\D/g, "") || null;

    // Step 1: Delete existing instance to get a clean state
    try {
      await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
        method: "DELETE",
        headers: evoHeaders,
      });
    } catch { /* ignore - instance may not exist */ }

    // Small delay to let the server clean up
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Create fresh instance
    let qrCode = null;
    let pairingCode = null;

    const createRes = await fetch(`${baseUrl}/instance/create`, {
      method: "POST",
      headers: evoHeaders,
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        number: userPhone,
      }),
    });

    if (createRes.ok) {
      try {
        const parsed = JSON.parse(await createRes.text());
        qrCode = parsed?.qrcode?.base64 || null;
        pairingCode = parsed?.qrcode?.pairingCode || null;
      } catch { /* ignore */ }
    }

    // Step 3: If no pairing code yet but we have a phone, call connect with number as query param
    if (!pairingCode && userPhone) {
      // Wait a bit for the instance to initialize
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const connectRes = await fetch(
          `${baseUrl}/instance/connect/${instanceName}?number=${userPhone}`,
          { method: "GET", headers: evoHeaders }
        );
        if (connectRes.ok) {
          const parsed = JSON.parse(await connectRes.text());
          pairingCode = parsed?.pairingCode || pairingCode;
          qrCode = parsed?.base64 || qrCode;
        }
      } catch { /* ignore */ }
    }

    // Update status to pending
    await serviceClient
      .from("pet_shop_configs")
      .update({ whatsapp_status: "pending" })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, qr_code: qrCode, pairing_code: pairingCode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
