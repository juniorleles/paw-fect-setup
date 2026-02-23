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

    // Parse request body for mobile flag
    let isMobile = false;
    try {
      const body = await req.json();
      isMobile = body?.mobile === true;
    } catch { /* no body or invalid json */ }

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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user phone for pairing code
    const { data: config } = await serviceClient
      .from("pet_shop_configs")
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle();

    let userPhone = config?.phone?.replace(/\D/g, "") || null;
    // Ensure phone has country code (Brazil = 55)
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

    // Small delay for clean state
    await new Promise(r => setTimeout(r, 1500));

    // Create fresh instance (always with qrcode:true for initial setup)
    const createBody: Record<string, unknown> = {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    };

    console.log("Creating instance with body:", JSON.stringify(createBody));

    const createRes = await fetch(`${baseUrl}/instance/create`, {
      method: "POST",
      headers: evoHeaders,
      body: JSON.stringify(createBody),
    });

    const createData = await createRes.json();
    console.log("Create instance response:", JSON.stringify(createData));

    // Update status to pending
    await serviceClient
      .from("pet_shop_configs")
      .update({ whatsapp_status: "pending" })
      .eq("user_id", user.id);

    // For mobile, request pairing code via connect endpoint with number query param
    if (isMobile && userPhone) {
      await new Promise(r => setTimeout(r, 3000));
      
      // Pass phone number as query parameter to get pairing code
      const connectUrl = `${baseUrl}/instance/connect/${instanceName}?number=${userPhone}`;
      console.log("Requesting pairing code from:", connectUrl);
      
      const connectRes = await fetch(connectUrl, {
        method: "GET",
        headers: evoHeaders,
      });
      const connectData = await connectRes.json();
      console.log("Connect response (pairing):", JSON.stringify(connectData));

      const pairingCode = connectData?.pairingCode || null;
      
      if (pairingCode) {
        return new Response(
          JSON.stringify({ success: true, pairingCode, mode: "pairing" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback: return QR code for mobile
      const qrBase64 = connectData?.base64 || connectData?.qrcode?.base64 || null;
      return new Response(
        JSON.stringify({ success: true, qrCode: qrBase64, mode: "qr", note: "Pairing code not available, showing QR" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For desktop, get QR code from connect
    await new Promise(r => setTimeout(r, 2000));
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: evoHeaders,
    });
    const connectData = await connectRes.json();
    console.log("Connect response:", JSON.stringify(connectData));

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
