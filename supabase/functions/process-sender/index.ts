import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUFFER_DELAY_MS = 8000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instanceName, senderPhone } = await req.json();

    if (!instanceName || !senderPhone) {
      return new Response(JSON.stringify({ error: "Missing instanceName or senderPhone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-sender] Triggered for ${senderPhone} @ ${instanceName}`);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Wait for the buffer delay — let the sender finish typing
    await new Promise((resolve) => setTimeout(resolve, BUFFER_DELAY_MS));

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Check if there are still recent unprocessed messages (sender still typing)
      const cutoff = new Date(Date.now() - BUFFER_DELAY_MS).toISOString();

      const { data: recentMessages } = await serviceClient
        .from("message_buffer")
        .select("id")
        .eq("instance_name", instanceName)
        .eq("sender_phone", senderPhone)
        .eq("processed", false)
        .gt("created_at", cutoff)
        .limit(1);

      if (recentMessages && recentMessages.length > 0) {
        console.log(`[process-sender] ${senderPhone} still typing, waiting... (attempt ${attempt + 1})`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      // Sender stopped typing — atomically claim all pending messages
      const { data: claimed, error: claimErr } = await serviceClient
        .from("message_buffer")
        .update({ processed: true })
        .eq("instance_name", instanceName)
        .eq("sender_phone", senderPhone)
        .eq("processed", false)
        .select("id, content, created_at")
        .order("created_at", { ascending: true });

      if (claimErr) {
        console.error(`[process-sender] Claim error: ${claimErr.message}`);
        return new Response(JSON.stringify({ error: claimErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!claimed || claimed.length === 0) {
        console.log(`[process-sender] No messages to claim for ${senderPhone} — already processed by another worker`);
        return new Response(JSON.stringify({ ok: true, processed: 0 }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Combine messages
      const combinedMessage = claimed.map((m: any) => m.content).join("\n");
      console.log(`[process-sender] Processing ${claimed.length} messages from ${senderPhone}: ${combinedMessage.substring(0, 200)}`);

      // Forward to AI handler
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
        console.log(`[process-sender] AI handler response for ${senderPhone}: ${aiRes.status}`);
      } catch (aiErr) {
        console.error(`[process-sender] AI handler error for ${senderPhone}:`, aiErr);
      }

      return new Response(JSON.stringify({ ok: true, processed: claimed.length }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exhausted retries — sender is still typing after max wait
    console.log(`[process-sender] Max retries reached for ${senderPhone}, will be picked up by safety-net cron`);

    return new Response(JSON.stringify({ ok: true, deferred: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[process-sender] Error:", err);
    return new Response(JSON.stringify({ error: "Processing error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
