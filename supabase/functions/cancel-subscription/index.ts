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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update subscription to cancelled
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "active");

    if (subError) {
      return new Response(JSON.stringify({ error: "Erro ao cancelar assinatura", details: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deactivate pet shop config
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient
      .from("pet_shop_configs")
      .update({ activated: false, phone_verified: false })
      .eq("user_id", user.id);

    // Disconnect WhatsApp via Evolution API
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE_NAME");

    let whatsappDisconnected = false;
    if (evolutionUrl && evolutionKey && evolutionInstance) {
      try {
        const logoutRes = await fetch(
          `${evolutionUrl}/instance/logout/${evolutionInstance}`,
          {
            method: "DELETE",
            headers: {
              apikey: evolutionKey,
              "Content-Type": "application/json",
            },
          }
        );
        whatsappDisconnected = logoutRes.ok;
        if (!logoutRes.ok) {
          console.error("Evolution API logout failed:", await logoutRes.text());
        }
      } catch (evoErr) {
        console.error("Evolution API error:", evoErr);
      }
    }

    // Log the action
    await supabase.from("subscription_logs").insert({
      user_id: user.id,
      action: "cancel",
      details: { cancelled_at: new Date().toISOString(), whatsapp_disconnected: whatsappDisconnected },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Assinatura cancelada com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
