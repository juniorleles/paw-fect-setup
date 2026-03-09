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

    const instanceName = `user_${user.id.replace(/-/g, "").substring(0, 16)}`;

    // Fetch config and validate onboarding is complete
    const { data: existingConfig } = await serviceClient
      .from("pet_shop_configs")
      .select("whatsapp_status, activated, shop_name, phone, services")
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
        JSON.stringify({ success: true, instance_name: instanceName, already_active: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    const evoHeaders: Record<string, string> = {
      apikey: evolutionKey.trim(),
      "Content-Type": "application/json",
    };

    // Single approach: try connect, create only if not found
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: evoHeaders,
    });

    if (!connectRes.ok && connectRes.status === 404) {
      const { data: config } = await serviceClient
        .from("pet_shop_configs")
        .select("phone")
        .eq("user_id", user.id)
        .maybeSingle();

      const userPhone = config?.phone?.replace(/\D/g, "") || null;

      await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: evoHeaders,
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          ...(userPhone ? { number: userPhone } : {}),
        }),
      });
    }

    // Register webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;
    try {
      await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
        method: "POST",
        headers: evoHeaders,
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: false,
            enabled: true,
            events: ["CONNECTION_UPDATE", "QRCODE_UPDATED", "MESSAGES_UPSERT"],
          },
        }),
      });
    } catch (whErr) {
      console.error("Webhook registration error:", whErr);
    }

    // Update instance name + status
    await serviceClient
      .from("pet_shop_configs")
      .update({ evolution_instance_name: instanceName, whatsapp_status: "pending" })
      .eq("user_id", user.id);

    // Ensure subscription exists and is active
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingSub) {
      await supabase.from("subscriptions").insert({ user_id: user.id, status: "active", plan: "free" });
    } else if (existingSub.status !== "active") {
      await supabase
        .from("subscriptions")
        .update({ status: "active", cancelled_at: null })
        .eq("id", existingSub.id);
    }

    // Log
    await supabase.from("subscription_logs").insert({
      user_id: user.id,
      action: "activate",
      details: { instance_name: instanceName, created_at: new Date().toISOString() },
    });

    return new Response(
      JSON.stringify({ success: true, instance_name: instanceName }),
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
