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

    // First try to logout existing session to force new QR
    try {
      await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers: evoHeaders,
      });
    } catch { /* ignore */ }

    // Connect to get new QR code and pairing code
    let qrCode = null;
    let pairingCode = null;
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: evoHeaders,
    });

    if (connectRes.ok) {
      try {
        const parsed = JSON.parse(await connectRes.text());
        qrCode = parsed?.base64 || null;
        pairingCode = parsed?.pairingCode || null;
      } catch { /* ignore */ }
    } else {
      // Instance may not exist, create it
      const createRes = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: evoHeaders,
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });

      if (createRes.ok) {
        try {
          const parsed = JSON.parse(await createRes.text());
          qrCode = parsed?.qrcode?.base64 || null;
          pairingCode = parsed?.qrcode?.pairingCode || null;
        } catch { /* ignore */ }
      }
    }

    // Update status to pending
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
