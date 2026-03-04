import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Rate Limiting ---
const rateLimitMap = new Map<string, { count: number; resetAt: number; alerted: boolean }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_ALERT_THRESHOLD = 50;

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

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now >= val.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Meta Webhook Verification (GET) ---
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("META_VERIFY_TOKEN");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[META-WEBHOOK] Verification successful");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }

    console.warn("[META-WEBHOOK] Verification failed", { mode, token });
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // --- Handle incoming webhook events (POST) ---
  try {
    const body = await req.json();
    console.log("[META-WEBHOOK] Received:", JSON.stringify(body).substring(0, 500));

    const serviceClient = getServiceClient();

    // Meta sends webhooks in this structure:
    // { object: "whatsapp_business_account", entry: [ { id: WABA_ID, changes: [...] } ] }
    if (body.object !== "whatsapp_business_account") {
      console.log("[META-WEBHOOK] Ignoring non-WhatsApp event:", body.object);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const entry of body.entry || []) {
      const wabaId = entry.id;

      // Find the pet_shop_config associated with this WABA ID
      const { data: config } = await serviceClient
        .from("pet_shop_configs")
        .select("id, user_id, evolution_instance_name, meta_phone_number_id")
        .eq("meta_waba_id", wabaId)
        .maybeSingle();

      if (!config) {
        console.warn(`[META-WEBHOOK] Unknown WABA ID: ${wabaId}`);
        continue;
      }

      for (const change of entry.changes || []) {
        const field = change.field;
        const value = change.value;

        // --- Handle incoming messages ---
        if (field === "messages" && value?.messages) {
          for (const msg of value.messages) {
            // Skip status updates
            if (!msg.from || !msg.text?.body) continue;

            const senderPhone = msg.from;
            const textContent = msg.text.body;

            // Rate limiting
            const rateCheck = isRateLimited(senderPhone);
            if (rateCheck.limited) {
              console.warn(`[RATE-LIMIT] Sender ${senderPhone} exceeded ${RATE_LIMIT_MAX} msgs/min (count: ${rateCheck.count})`);
              if (rateCheck.shouldAlert) {
                await serviceClient.from("system_alerts").insert({
                  alert_type: "rate_limit",
                  severity: "warning",
                  message: `Rate limit acionado: ${senderPhone} enviou ${rateCheck.count}+ msgs/min (Cloud API, WABA ${wabaId})`,
                  details: { sender: senderPhone, waba_id: wabaId, count: rateCheck.count },
                });
              }
              continue;
            }

            // Deduplication
            const thirtySecAgo = new Date(Date.now() - 30_000).toISOString();
            const { data: existing } = await serviceClient
              .from("message_buffer")
              .select("id")
              .eq("instance_name", `meta_${wabaId}`)
              .eq("sender_phone", senderPhone)
              .eq("content", textContent)
              .eq("processed", false)
              .gte("created_at", thirtySecAgo)
              .limit(1);

            if (existing && existing.length > 0) {
              console.log("[META-WEBHOOK] Duplicate message, skipping");
              continue;
            }

            console.log(`[META-WEBHOOK] Buffering message from ${senderPhone}: ${textContent.substring(0, 100)}`);

            // Use "meta_{wabaId}" as the instance_name for compatibility with existing flow
            const { error: bufferErr } = await serviceClient
              .from("message_buffer")
              .insert({
                instance_name: `meta_${wabaId}`,
                sender_phone: senderPhone,
                content: textContent,
              });

            if (bufferErr) {
              console.error("[META-WEBHOOK] Buffer insert error:", bufferErr.message);
            } else {
              // Fire-and-forget: trigger process-sender
              const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
              fetch(`${supabaseUrl}/functions/v1/process-sender`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  instanceName: `meta_${wabaId}`,
                  senderPhone,
                }),
              }).catch((e) => console.error("[META-WEBHOOK] process-sender trigger error:", e));
            }
          }
        }

        // --- Handle message status updates ---
        if (field === "messages" && value?.statuses) {
          for (const status of value.statuses) {
            console.log(`[META-WEBHOOK] Message status: ${status.id} → ${status.status}`);
          }
        }

        // --- Handle account updates (e.g. phone number quality) ---
        if (field === "account_update") {
          console.log("[META-WEBHOOK] Account update:", JSON.stringify(value));
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[META-WEBHOOK] Error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
