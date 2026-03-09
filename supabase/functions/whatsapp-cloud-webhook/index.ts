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
            if (!msg.from) continue;

            const senderPhone = msg.from;
            const msgType = msg.type; // text, audio, image, video, document, etc.

            // Determine content and media info
            let textContent: string | null = null;
            let mediaType: string | null = null;
            let mediaId: string | null = null;

            if (msgType === "text" && msg.text?.body) {
              textContent = msg.text.body;
            } else if (msgType === "audio" && msg.audio?.id) {
              mediaType = "audio";
              mediaId = msg.audio.id;
              textContent = "[audio]"; // placeholder for buffer
            } else if (msgType === "image" && msg.image?.id) {
              mediaType = "image";
              mediaId = msg.image.id;
              textContent = msg.image.caption || "[image]";
            } else {
              // Unsupported type (video, document, sticker, etc.) — skip
              console.log(`[META-WEBHOOK] Unsupported message type: ${msgType}`);
              continue;
            }

            // For media messages, check if the business owner has Pro plan
            if (mediaType) {
              const { data: subscription } = await serviceClient
                .from("subscriptions")
                .select("plan")
                .eq("user_id", config.user_id)
                .maybeSingle();

              const plan = subscription?.plan || "free";
              const isPro = plan === "professional";

              if (!isPro) {
                console.log(`[META-WEBHOOK] Media message from ${senderPhone} but owner plan is ${plan} — sending fallback`);
                
                // Send polite fallback via Meta API
                const accessToken = config.meta_access_token;
                const phoneNumberId = config.meta_phone_number_id;
                if (accessToken && phoneNumberId) {
                  const fallbackText = "No momento só consigo ler mensagens de texto 😊 Pode me escrever o que precisa?";
                  await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      messaging_product: "whatsapp",
                      recipient_type: "individual",
                      to: senderPhone,
                      type: "text",
                      text: { body: fallbackText },
                    }),
                  }).catch((e) => console.error("[META-WEBHOOK] Fallback send error:", e));
                }
                continue;
              }

              // Pro plan: download media from Meta to get a URL
              console.log(`[META-WEBHOOK] Pro plan — downloading ${mediaType} media ${mediaId}`);
              try {
                // Use System User Token (permanent) for media downloads — user tokens expire in ~1h
                const accessToken = Deno.env.get("META_SYSTEM_USER_TOKEN") || config.meta_access_token;
                // Step 1: Get media URL from Meta
                const mediaInfoRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                const mediaInfo = await mediaInfoRes.json();
                const mediaUrl = mediaInfo.url;

                if (!mediaUrl) {
                  console.error("[META-WEBHOOK] Could not get media URL:", JSON.stringify(mediaInfo));
                  continue;
                }

                // Step 2: Download the actual media binary
                const mediaBinaryRes = await fetch(mediaUrl, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                const mediaBuffer = await mediaBinaryRes.arrayBuffer();
                const mimeType = mediaBinaryRes.headers.get("content-type") || (mediaType === "audio" ? "audio/ogg" : "image/jpeg");
                const ext = mediaType === "audio" ? "ogg" : (mimeType.includes("png") ? "png" : "jpg");

                // Step 3: Upload to storage bucket
                const storagePath = `${config.user_id}/${senderPhone}/${Date.now()}.${ext}`;
                const { error: uploadErr } = await serviceClient.storage
                  .from("customer-media")
                  .upload(storagePath, mediaBuffer, { contentType: mimeType });

                if (uploadErr) {
                  console.error("[META-WEBHOOK] Storage upload error:", uploadErr.message);
                } else {
                  console.log(`[META-WEBHOOK] Media uploaded to customer-media/${storagePath}`);
                }

                // Build the internal media URL for the AI handler
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const internalMediaUrl = `${supabaseUrl}/storage/v1/object/customer-media/${storagePath}`;

                // Buffer the media message with metadata
                textContent = JSON.stringify({
                  _media: true,
                  type: mediaType,
                  mediaUrl: internalMediaUrl,
                  storagePath,
                  mimeType,
                  caption: msg.image?.caption || null,
                  originalMediaId: mediaId,
                });
              } catch (mediaErr) {
                console.error("[META-WEBHOOK] Media processing error:", mediaErr);
                continue;
              }
            }

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
