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

    // Fetch config and validate onboarding is complete
    const { data: existingConfig } = await serviceClient
      .from("pet_shop_configs")
      .select("whatsapp_status, activated, shop_name, phone, services, meta_waba_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingConfig) {
      return new Response(
        JSON.stringify({ error: "Configuração não encontrada. Complete o onboarding primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required onboarding fields
    const services = existingConfig.services as any[];
    const hasRequiredData = existingConfig.shop_name?.trim() &&
      existingConfig.phone?.trim() &&
      Array.isArray(services) && services.length > 0;

    if (!hasRequiredData) {
      return new Response(
        JSON.stringify({ error: "Complete todas as etapas do onboarding antes de ativar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingConfig?.whatsapp_status === "connected") {
      return new Response(
        JSON.stringify({ success: true, already_active: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to pending — user will connect via Meta Embedded Signup
    await serviceClient
      .from("pet_shop_configs")
      .update({ whatsapp_status: "pending", activated: true })
      .eq("user_id", user.id);

    // Ensure subscription exists and is active
    const { data: existingSub } = await serviceClient
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingSub) {
      await serviceClient.from("subscriptions").insert({
        user_id: user.id,
        status: "active",
        plan: "free",
        trial_appointments_limit: 30,
        trial_messages_limit: 150,
        trial_appointments_used: 0,
        trial_messages_used: 0,
        trial_end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } else if (existingSub.status !== "active") {
      await serviceClient
        .from("subscriptions")
        .update({ status: "active", cancelled_at: null })
        .eq("id", existingSub.id);
    }

    // Log
    await supabase.from("subscription_logs").insert({
      user_id: user.id,
      action: "activate",
      details: { provider: "meta", created_at: new Date().toISOString() },
    });

    return new Response(
      JSON.stringify({ success: true }),
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
