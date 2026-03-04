import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Rate Limiting ---
const rateLimitMap = new Map<string, { count: number; resetAt: number; alerted: boolean }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 messages per sender per minute
const RATE_LIMIT_ALERT_THRESHOLD = 50; // alert when sender exceeds this count

function isRateLimited(senderPhone: string): { limited: boolean; shouldAlert: boolean; count: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(senderPhone);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(senderPhone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS, alerted: false });
    return { limited: false, shouldAlert: false, count: 1 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    const shouldAlert = entry.count >= RATE_LIMIT_ALERT_THRESHOLD && !entry.alerted;
    if (shouldAlert) entry.alerted = true;
    return { limited: true, shouldAlert, count: entry.count };
  }
  return { limited: false, shouldAlert: false, count: entry.count };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now >= val.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

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

    // --- Instance-based validation ---
    // Verify the instance exists in our DB to reject spoofed webhooks
    const { data: knownInstance } = await serviceClient
      .from("pet_shop_configs")
      .select("id")
      .eq("evolution_instance_name", instanceName)
      .maybeSingle();

    if (!knownInstance) {
      console.warn(`[WEBHOOK-AUTH] Rejected unknown instance: ${instanceName}`);
      return new Response(JSON.stringify({ error: "Unknown instance" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[WEBHOOK-AUTH] Authorized instance: ${instanceName}`);

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

        // Rate limiting per sender
        const rateCheck = isRateLimited(senderPhone);
        if (rateCheck.limited) {
          console.warn(`[RATE-LIMIT] Sender ${senderPhone} exceeded ${RATE_LIMIT_MAX} msgs/min (count: ${rateCheck.count}), dropping`);
          
          if (rateCheck.shouldAlert) {
            await serviceClient.from("system_alerts").insert({
              alert_type: "rate_limit",
              severity: "warning",
              message: `Rate limit acionado: ${senderPhone} enviou ${rateCheck.count}+ msgs/min na instância ${instanceName}`,
              details: { sender: senderPhone, instance: instanceName, count: rateCheck.count },
            });
            console.warn(`[RATE-LIMIT] Alert created for ${senderPhone}`);
          }
          continue;
        }

        // Deduplication: skip if same content is already PENDING (unprocessed) recently
        const thirtySecAgo = new Date(Date.now() - 30_000).toISOString();
        const { data: existing } = await serviceClient
          .from("message_buffer")
          .select("id")
          .eq("instance_name", instanceName)
          .eq("sender_phone", senderPhone)
          .eq("content", textContent)
          .eq("processed", false)
          .gte("created_at", thirtySecAgo)
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
