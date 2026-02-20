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

    // Reactivate subscription
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({ status: "active", cancelled_at: null })
      .eq("user_id", user.id)
      .eq("status", "cancelled");

    if (subError) {
      return new Response(JSON.stringify({ error: "Erro ao reativar assinatura", details: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create new per-user instance on Evolution API
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
    const instanceName = `user_${user.id.replace(/-/g, "").substring(0, 16)}`;

    let qrCode = null;
    let whatsappReconnected = false;

    if (evolutionUrl && evolutionKey) {
      const baseUrl = evolutionUrl.replace(/\/+$/, "");
      const evoHeaders: Record<string, string> = {
        apikey: evolutionKey.trim(),
        "Content-Type": "application/json",
      };
      try {
        console.log(`Creating instance for reactivation: ${instanceName}`);
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

        if (createRes.ok) {
          whatsappReconnected = true;
          try {
            const parsed = JSON.parse(createBody);
            qrCode = parsed?.qrcode?.base64 || null;
          } catch { /* ignore */ }
        } else if (createRes.status === 409 || createBody.includes("already")) {
          const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
            method: "GET",
            headers: evoHeaders,
          });
          whatsappReconnected = connectRes.ok;
          if (connectRes.ok) {
            try {
              const parsed = JSON.parse(await connectRes.text());
              qrCode = parsed?.base64 || null;
            } catch { /* ignore */ }
          }
        }
      } catch (evoErr) {
        console.error("Evolution API error:", evoErr);
      }

      // Register webhook for connection status updates
      if (whatsappReconnected) {
        const supabaseProjectUrl = Deno.env.get("SUPABASE_URL")!;
        const webhookUrl = `${supabaseProjectUrl}/functions/v1/evolution-webhook`;
        try {
          const webhookRes = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
            method: "POST",
            headers: evoHeaders,
            body: JSON.stringify({
              webhook: {
                url: webhookUrl,
                webhook_by_events: false,
                webhook_base64: false,
                enabled: true,
                events: ["CONNECTION_UPDATE", "QRCODE_UPDATED"],
              },
            }),
          });
          console.log("Webhook registration:", webhookRes.status, await webhookRes.text());
        } catch (whErr) {
          console.error("Webhook registration error:", whErr);
        }
      }
    }

    // Reactivate config with new instance
    await serviceClient
      .from("pet_shop_configs")
      .update({
        activated: true,
        evolution_instance_name: instanceName,
        whatsapp_status: whatsappReconnected ? "pending" : "disconnected",
      })
      .eq("user_id", user.id);

    // Log
    await supabase.from("subscription_logs").insert({
      user_id: user.id,
      action: "reactivate",
      details: {
        reactivated_at: new Date().toISOString(),
        instance_name: instanceName,
        whatsapp_reconnected: whatsappReconnected,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Assinatura reativada com sucesso",
        instance_name: instanceName,
        qr_code: qrCode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
