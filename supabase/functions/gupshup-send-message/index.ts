// Envia mensagem de WhatsApp via Gupshup API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GUPSHUP_API_KEY = Deno.env.get("GUPSHUP_API_KEY")!;
const GUPSHUP_API_URL = "https://api.gupshup.io/wa/api/v1/msg";

interface SendRequest {
  userId: string;
  destination: string; // phone with country code, no '+'
  message: string;
  messageType?: "text" | "template";
  templateId?: string;
  templateParams?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GUPSHUP_API_KEY) {
      throw new Error("GUPSHUP_API_KEY not configured");
    }

    const body = (await req.json()) as SendRequest;
    const { userId, destination, message, messageType = "text", templateId, templateParams } = body;

    if (!userId || !destination || !message) {
      return new Response(
        JSON.stringify({ error: "userId, destination and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar configuração do Gupshup do usuário
    const { data: config, error: configError } = await supabase
      .from("pet_shop_configs")
      .select("gupshup_app_name, gupshup_phone_number, whatsapp_provider, gupshup_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (configError || !config) {
      throw new Error(`Config not found: ${configError?.message || "no config"}`);
    }

    if (config.whatsapp_provider !== "gupshup" || config.gupshup_status !== "connected") {
      throw new Error("Gupshup not connected for this user");
    }

    if (!config.gupshup_app_name || !config.gupshup_phone_number) {
      throw new Error("Gupshup app_name or phone not configured");
    }

    // Limpar destino (apenas dígitos)
    const cleanDestination = destination.replace(/\D/g, "");

    // Montar form-urlencoded conforme API Gupshup
    const formData = new URLSearchParams();
    formData.append("channel", "whatsapp");
    formData.append("source", config.gupshup_phone_number);
    formData.append("destination", cleanDestination);
    formData.append("src.name", config.gupshup_app_name);

    if (messageType === "template" && templateId) {
      formData.append("template", JSON.stringify({
        id: templateId,
        params: templateParams || [],
      }));
    } else {
      formData.append("message", JSON.stringify({
        type: "text",
        text: message,
      }));
    }

    console.log(`[gupshup-send] Sending to ${cleanDestination} via app ${config.gupshup_app_name}`);

    const response = await fetch(GUPSHUP_API_URL, {
      method: "POST",
      headers: {
        "apikey": GUPSHUP_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok || result.status === "error") {
      console.error("[gupshup-send] API error:", result);
      // Salvar como erro
      await supabase.from("whatsapp_messages").insert({
        user_id: userId,
        provider: "gupshup",
        direction: "outbound",
        phone: cleanDestination,
        content: message,
        message_type: messageType,
        status: "failed",
        error_message: result.message || JSON.stringify(result),
      });
      throw new Error(`Gupshup API error [${response.status}]: ${JSON.stringify(result)}`);
    }

    // Salvar mensagem outbound
    await supabase.from("whatsapp_messages").insert({
      user_id: userId,
      provider: "gupshup",
      direction: "outbound",
      phone: cleanDestination,
      content: message,
      message_type: messageType,
      status: "sent",
      external_message_id: result.messageId,
      metadata: result,
    });

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[gupshup-send] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
