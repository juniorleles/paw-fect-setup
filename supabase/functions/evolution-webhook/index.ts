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
    // --- API Key Validation ---
    // Evolution API sends the apikey in the payload and optionally in headers.
    // Validate against our stored EVOLUTION_API_KEY to reject unauthorized requests.
    const expectedKey = Deno.env.get("EVOLUTION_API_KEY");
    
    const body = await req.json();
    
    const incomingKey = body?.apikey 
      || req.headers.get("apikey") 
      || req.headers.get("x-api-key")
      || null;

    if (!expectedKey || !incomingKey || incomingKey.trim() !== expectedKey.trim()) {
      const inFirst4 = incomingKey ? incomingKey.substring(0, 4) : "null";
      const exFirst4 = expectedKey ? expectedKey.substring(0, 4) : "null";
      console.warn(`[WEBHOOK-AUTH] Rejected. Incoming starts: "${inFirst4}" (len=${incomingKey?.length}), Expected starts: "${exFirst4}" (len=${expectedKey?.length})`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[WEBHOOK-AUTH] Authorized successfully");

    console.log("Evolution webhook received:", JSON.stringify(body).substring(0, 500));

    const event = body.event;
    const instance = body.instance;
    const instanceName = instance || body.instanceName || body.data?.instance;

    if (!instanceName) {
      console.log("No instance name in webhook payload");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle CONNECTION_UPDATE events
    if (event === "CONNECTION_UPDATE" || event === "connection.update") {
      const state = body.data?.state || body.data?.status || body.state;
      console.log(`Connection update for ${instanceName}: state=${state}`);

      let whatsappStatus = "pending";
      if (state === "open" || state === "connected") {
        whatsappStatus = "connected";
      } else if (state === "close" || state === "disconnected") {
        whatsappStatus = "disconnected";
      } else if (state === "connecting") {
        whatsappStatus = "pending";
      }

      const { error } = await serviceClient
        .from("pet_shop_configs")
        .update({ whatsapp_status: whatsappStatus })
        .eq("evolution_instance_name", instanceName);

      if (error) {
        console.error("Error updating whatsapp_status:", error.message);
      } else {
        console.log(`Updated whatsapp_status to '${whatsappStatus}' for instance '${instanceName}'`);
      }

      if (whatsappStatus === "disconnected") {
        await serviceClient.from("system_alerts").insert({
          alert_type: "disconnection",
          severity: "warning",
          message: `WhatsApp desconectado: ${instanceName}`,
          details: { instance: instanceName, state },
        });
      }
    }

    // Handle QRCODE_UPDATED
    if (event === "QRCODE_UPDATED" || event === "qrcode.updated") {
      console.log(`QR code updated for ${instanceName}`);
    }

    // Handle incoming messages — just buffer, no processing
    if (event === "MESSAGES_UPSERT" || event === "messages.upsert") {
      const messages = body.data || [];
      const msgArray = Array.isArray(messages) ? messages : [messages];

      for (const msg of msgArray) {
        if (msg.key?.fromMe) continue;

        const textContent = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || msg.message?.ephemeralMessage?.message?.conversation
          || msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text;

        if (!textContent) continue;

        const senderPhone = msg.key?.remoteJid;
        if (!senderPhone || senderPhone.endsWith("@g.us")) continue;

        // Deduplication: skip if same content was already buffered recently
        const twoMinAgo = new Date(Date.now() - 120_000).toISOString();
        const { data: existing } = await serviceClient
          .from("message_buffer")
          .select("id")
          .eq("instance_name", instanceName)
          .eq("sender_phone", senderPhone)
          .eq("content", textContent)
          .gte("created_at", twoMinAgo)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`Duplicate message detected, skipping`);
          continue;
        }

        console.log(`Buffered message from ${senderPhone}: ${textContent.substring(0, 100)}`);

        const { error: bufferErr } = await serviceClient
          .from("message_buffer")
          .insert({
            instance_name: instanceName,
            sender_phone: senderPhone,
            content: textContent,
          });

        if (bufferErr) {
          console.error("Buffer insert error:", bufferErr.message);
        } else {
          // Fire-and-forget: trigger event-driven processing for this sender
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          fetch(`${supabaseUrl}/functions/v1/process-sender`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instanceName,
              senderPhone,
            }),
          }).catch((e) => console.error("Fire-and-forget trigger error:", e));
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
