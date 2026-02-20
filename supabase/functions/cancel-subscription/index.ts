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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the user's instance name from DB
    const { data: config } = await serviceClient
      .from("pet_shop_configs")
      .select("evolution_instance_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const instanceName = config?.evolution_instance_name;

    // Delete instance on Evolution API (per-user)
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");

    let whatsappDisconnected = false;
    if (evolutionUrl && evolutionKey && instanceName) {
      const baseUrl = evolutionUrl.replace(/\/+$/, "");
      const evoHeaders: Record<string, string> = {
        apikey: evolutionKey.trim(),
        "Content-Type": "application/json",
      };
      try {
        console.log(`Logging out instance: ${instanceName}`);
        const logoutRes = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
          method: "DELETE",
          headers: evoHeaders,
        });
        console.log("Logout response:", logoutRes.status, await logoutRes.text());

        console.log(`Deleting instance: ${instanceName}`);
        const deleteRes = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
          method: "DELETE",
          headers: evoHeaders,
        });
        const deleteBody = await deleteRes.text();
        console.log("Delete response:", deleteRes.status, deleteBody);
        whatsappDisconnected = deleteRes.ok || logoutRes.ok;
      } catch (evoErr) {
        console.error("Evolution API error:", evoErr);
      }
    }

    // Deactivate config and clear instance
    await serviceClient
      .from("pet_shop_configs")
      .update({
        activated: false,
        phone_verified: false,
        whatsapp_status: "disconnected",
        evolution_instance_name: "",
      })
      .eq("user_id", user.id);

    // Log
    await supabase.from("subscription_logs").insert({
      user_id: user.id,
      action: "cancel",
      details: {
        cancelled_at: new Date().toISOString(),
        instance_deleted: instanceName || null,
        whatsapp_disconnected: whatsappDisconnected,
      },
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
