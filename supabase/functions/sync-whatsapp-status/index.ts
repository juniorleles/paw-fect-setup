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

    // Get user's config
    const { data: config } = await serviceClient
      .from("pet_shop_configs")
      .select("whatsapp_status, evolution_instance_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!config || !config.evolution_instance_name) {
      return new Response(
        JSON.stringify({ status: "disconnected", synced: false, provider: "evolution" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const evolutionUrl = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "";

    if (!evolutionUrl || !evolutionKey) {
      return new Response(
        JSON.stringify({ status: config.whatsapp_status || "disconnected", synced: false, provider: "evolution" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let mappedStatus: "connected" | "pending" | "disconnected" = "disconnected";

    try {
      const stateRes = await fetch(
        `${evolutionUrl}/instance/connectionState/${config.evolution_instance_name}`,
        {
          method: "GET",
          headers: { apikey: evolutionKey.trim(), "Content-Type": "application/json" },
        }
      );

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        const evoState = stateData?.instance?.state || stateData?.state || "unknown";
        if (evoState === "open" || evoState === "connected") {
          mappedStatus = "connected";
        } else if (evoState === "connecting" || evoState === "qrcode") {
          mappedStatus = "pending";
        } else {
          mappedStatus = "disconnected";
        }
      } else if (stateRes.status === 401) {
        // Pre-ban signal — alert admin
        console.warn(`[SYNC] Pre-ban 401 detected for ${config.evolution_instance_name}`);
        try {
          await serviceClient.from("system_alerts").insert({
            alert_type: "pre_ban",
            severity: "critical",
            message: `⚠️ Possível pré-ban detectado: ${config.evolution_instance_name}`,
            details: { instance: config.evolution_instance_name, user_id: user.id, status: 401 },
          });
        } catch { /* ignore */ }
        mappedStatus = "disconnected";
      } else {
        mappedStatus = "disconnected";
      }
    } catch (err) {
      console.warn("[SYNC] Evolution API check error:", err);
      mappedStatus = (config.whatsapp_status as any) || "disconnected";
    }

    if (mappedStatus !== config.whatsapp_status) {
      await serviceClient
        .from("pet_shop_configs")
        .update({ whatsapp_status: mappedStatus })
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({
        status: mappedStatus,
        synced: mappedStatus !== config.whatsapp_status,
        provider: "evolution",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
