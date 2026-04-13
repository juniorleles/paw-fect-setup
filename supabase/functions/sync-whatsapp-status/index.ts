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
      .select("whatsapp_status, meta_waba_id, meta_phone_number_id, meta_access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!config) {
      return new Response(JSON.stringify({ status: "disconnected", synced: false, provider: "meta" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate Meta token by calling Meta API
    if (config.meta_waba_id && config.meta_access_token && config.meta_phone_number_id) {
      let metaStatus = "connected";

      try {
        const metaRes = await fetch(
          `https://graph.facebook.com/v21.0/${config.meta_phone_number_id}?fields=verified_name,quality_rating`,
          {
            headers: { Authorization: `Bearer ${config.meta_access_token}` },
          }
        );

        if (metaRes.ok) {
          metaStatus = "connected";
        } else {
          const body = await metaRes.text();
          console.warn(`[SYNC] Meta token validation failed: ${metaRes.status} ${body.substring(0, 200)}`);
          metaStatus = "disconnected";
        }
      } catch (err) {
        console.warn("[SYNC] Meta API check error:", err);
        metaStatus = config.whatsapp_status || "connected";
      }

      if (metaStatus !== config.whatsapp_status) {
        await serviceClient
          .from("pet_shop_configs")
          .update({ whatsapp_status: metaStatus })
          .eq("user_id", user.id);
      }

      return new Response(JSON.stringify({ status: metaStatus, synced: metaStatus !== config.whatsapp_status, provider: "meta" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No Meta config — user hasn't connected yet
    return new Response(JSON.stringify({ status: "disconnected", synced: false, provider: "meta" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
