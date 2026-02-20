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
    const body = await req.json();
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
    }

    // Handle QRCODE_UPDATED
    if (event === "QRCODE_UPDATED" || event === "qrcode.updated") {
      console.log(`QR code updated for ${instanceName}`);
    }

    // Handle incoming messages
    if (event === "MESSAGES_UPSERT" || event === "messages.upsert") {
      const messages = body.data || [];
      const msgArray = Array.isArray(messages) ? messages : [messages];

      for (const msg of msgArray) {
        // Skip messages sent by us (fromMe) and non-text messages
        if (msg.key?.fromMe) continue;
        
        const textContent = msg.message?.conversation 
          || msg.message?.extendedTextMessage?.text
          || msg.message?.ephemeralMessage?.message?.conversation
          || msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text;
        
        if (!textContent) continue;

        const senderPhone = msg.key?.remoteJid;
        if (!senderPhone || senderPhone.endsWith("@g.us")) continue; // Skip group messages

        console.log(`Message from ${senderPhone}: ${textContent.substring(0, 100)}`);

        // Forward to AI handler
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        try {
          const aiRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-handler`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instanceName,
              message: textContent,
              senderPhone,
            }),
          });
          console.log("AI handler response:", aiRes.status);
        } catch (aiErr) {
          console.error("AI handler call error:", aiErr);
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
      status: 200, // Return 200 to prevent retries
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
