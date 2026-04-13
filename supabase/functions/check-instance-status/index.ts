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

    // Verify admin role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instance_name } = await req.json();
    if (!instance_name) {
      return new Response(JSON.stringify({ error: "instance_name é obrigatório" }), {
        status: 400,
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

    const baseUrl = evolutionUrl.replace(/\/+$/, "");
    const evoHeaders = {
      apikey: evolutionKey.trim(),
      "Content-Type": "application/json",
    };

    // Fetch instance connection state
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instance_name}`, {
      method: "GET",
      headers: evoHeaders,
    });

    if (!stateRes.ok) {
      const errBody = await stateRes.text();
      console.error("Evolution API error:", stateRes.status, errBody);

      if (stateRes.status === 404) {
        // Update DB status to disconnected
        await serviceClient
          .from("pet_shop_configs")
          .update({ whatsapp_status: "disconnected" })
          .eq("evolution_instance_name", instance_name);

        return new Response(JSON.stringify({ 
          state: "not_found", 
          label: "Instância não encontrada",
          synced: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao consultar Evolution API", details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stateData = await stateRes.json();
    console.log("Instance state:", JSON.stringify(stateData));

    // Map Evolution state to our status
    const evolutionState = stateData?.instance?.state || stateData?.state || "unknown";
    let mappedStatus = "disconnected";
    if (evolutionState === "open" || evolutionState === "connected") {
      mappedStatus = "connected";
    } else if (evolutionState === "connecting" || evolutionState === "qrcode") {
      mappedStatus = "pending";
    }

    // Sync status in DB
    await serviceClient
      .from("pet_shop_configs")
      .update({ whatsapp_status: mappedStatus })
      .eq("evolution_instance_name", instance_name);

    return new Response(JSON.stringify({
      state: evolutionState,
      mapped_status: mappedStatus,
      label: evolutionState === "open" ? "Conectado" : evolutionState === "connecting" ? "Conectando..." : evolutionState,
      synced: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Erro interno", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
