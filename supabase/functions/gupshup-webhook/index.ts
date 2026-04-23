// Gupshup Webhook - recebe mensagens e eventos do WhatsApp via Gupshup
// Endpoint público (verify_jwt = false) configurado em config.toml
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gupshup-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("GUPSHUP_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar webhook secret (Gupshup envia via query param ?secret= ou header)
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret");
    const headerSecret = req.headers.get("x-webhook-secret");
    const providedSecret = querySecret || headerSecret;

    if (WEBHOOK_SECRET && providedSecret !== WEBHOOK_SECRET) {
      console.warn("[gupshup-webhook] Invalid secret", { providedSecret });
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("[gupshup-webhook] Received:", JSON.stringify(payload).substring(0, 500));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Estrutura típica do payload Gupshup:
    // { app: "appName", timestamp, version, type: "message"|"message-event"|"user-event", payload: {...} }
    const eventType = payload.type;
    const appName = payload.app;
    const data = payload.payload || {};

    // ===== MENSAGEM RECEBIDA =====
    if (eventType === "message") {
      // Identificar usuário pelo app name (gupshup_app_name)
      const { data: config } = await supabase
        .from("pet_shop_configs")
        .select("user_id, gupshup_phone_number")
        .eq("gupshup_app_name", appName)
        .maybeSingle();

      if (!config) {
        console.warn(`[gupshup-webhook] No config found for app: ${appName}`);
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const senderPhone = data.sender?.phone || data.source;
      const messageType = data.type || "text";
      let content = "";

      if (messageType === "text") {
        content = data.payload?.text || "";
      } else if (messageType === "image" || messageType === "audio" || messageType === "video") {
        content = data.payload?.url || "";
      }

      // Salvar mensagem inbound
      await supabase.from("whatsapp_messages").insert({
        user_id: config.user_id,
        provider: "gupshup",
        direction: "inbound",
        phone: senderPhone,
        content,
        message_type: messageType,
        status: "received",
        external_message_id: data.id,
        metadata: data,
      });

      // Adicionar ao buffer para processamento pelo whatsapp-ai-handler
      await supabase.from("message_buffer").insert({
        instance_name: appName,
        sender_phone: senderPhone,
        content,
        processed: false,
      });

      console.log(`[gupshup-webhook] Message buffered from ${senderPhone}`);
    }

    // ===== EVENTO DE STATUS DE MENSAGEM (entregue, lido, etc) =====
    if (eventType === "message-event") {
      const externalId = data.id || data.gsId;
      const newStatus = data.type; // sent, delivered, read, failed

      if (externalId) {
        await supabase
          .from("whatsapp_messages")
          .update({
            status: newStatus,
            error_message: data.reason || null,
          })
          .eq("external_message_id", externalId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[gupshup-webhook] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
