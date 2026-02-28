import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUFFER_DELAY_MS = 8000; // Wait 8 seconds for more messages (users often send 2-4 rapid fragments)

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

      // Generate alert for disconnections
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

    // Handle incoming messages
    if (event === "MESSAGES_UPSERT" || event === "messages.upsert") {
      const messages = body.data || [];
      const msgArray = Array.isArray(messages) ? messages : [messages];

      for (const msg of msgArray) {
        // Block all messages from the connected number itself to prevent loops
        if (msg.key?.fromMe) continue;
        
        const textContent = msg.message?.conversation 
          || msg.message?.extendedTextMessage?.text
          || msg.message?.ephemeralMessage?.message?.conversation
          || msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text;
        
        if (!textContent) continue;

        const senderPhone = msg.key?.remoteJid;
        if (!senderPhone || senderPhone.endsWith("@g.us")) continue; // Skip group messages

        console.log(`Message from ${senderPhone}: ${textContent.substring(0, 100)}`);

        // Insert into message buffer instead of immediately processing
        const { data: buffered, error: bufferErr } = await serviceClient
          .from("message_buffer")
          .insert({
            instance_name: instanceName,
            sender_phone: senderPhone,
            content: textContent,
          })
          .select("id, created_at")
          .single();

        if (bufferErr) {
          console.error("Buffer insert error:", bufferErr.message);
          continue;
        }

        const bufferedId = buffered.id;
        const bufferedAt = buffered.created_at;

        console.log(`Buffered message ${bufferedId}, waiting ${BUFFER_DELAY_MS}ms...`);

        // Wait for more messages
        await sleep(BUFFER_DELAY_MS);

        // Check if newer unprocessed messages arrived from same sender
        // Use the latest unprocessed message ID to break ties when created_at matches.
        const { data: latestPending } = await serviceClient
          .from("message_buffer")
          .select("id")
          .eq("instance_name", instanceName)
          .eq("sender_phone", senderPhone)
          .eq("processed", false)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1);

        const latestId = latestPending?.[0]?.id;
        if (latestId && latestId !== bufferedId) {
          // A newer (or higher-ID) message exists — that invocation will handle the batch
          console.log(`Skipping message ${bufferedId}: deferring to ${latestId}`);
          continue;
        }

        // Atomically claim all unprocessed messages by marking them processed and returning them
        const { data: allClaimed, error: claimErr } = await serviceClient
          .from("message_buffer")
          .update({ processed: true })
          .eq("instance_name", instanceName)
          .eq("sender_phone", senderPhone)
          .eq("processed", false)
          .gte("created_at", bufferedAt)
          .select("id, content, created_at")
          .order("created_at", { ascending: true });

        if (claimErr) {
          console.error("Claim error:", claimErr.message);
          continue;
        }

        if (!allClaimed || allClaimed.length === 0) {
          console.log(`No messages to claim for ${senderPhone} — another invocation already processed them`);
          continue;
        }

        // Combine messages
        const combinedMessage = allClaimed.map((m: any) => m.content).join("\n");
        console.log(`Processing ${allClaimed.length} combined messages from ${senderPhone}: ${combinedMessage.substring(0, 200)}`);

        // Forward combined message to AI handler
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        try {
          const aiRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-handler`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instanceName,
              message: combinedMessage,
              senderPhone,
            }),
          });
          console.log("AI handler response:", aiRes.status);
        } catch (aiErr) {
          console.error("AI handler call error:", aiErr);
        }
      }

      // Cleanup old processed buffer entries (older than 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      await serviceClient
        .from("message_buffer")
        .delete()
        .eq("processed", true)
        .lt("created_at", oneHourAgo);
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
