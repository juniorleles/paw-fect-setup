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

    // Try to acquire lock for this sender
    const { data: lockResult, error: lockErr } = await serviceClient
      .rpc("acquire_sender_lock", {
        p_sender_id: senderPhone,
        p_instance_name: instanceName,
      });

    if (lockErr) {
      console.error(`[process-sender] Lock error: ${lockErr.message}`);
      return new Response(JSON.stringify({ error: lockErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lockResult) {
      // Another process is already handling this sender
      console.log(`[process-sender] Lock NOT acquired for ${senderPhone} — another process is handling it`);
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "locked" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-sender] Lock acquired for ${senderPhone}`);

    try {
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
          break;
        }

        if (!claimed || claimed.length === 0) {
          console.log(`[process-sender] No messages to claim for ${senderPhone} — already processed`);
          break;
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
          await aiRes.text(); // consume body
        } catch (aiErr) {
          console.error(`[process-sender] AI handler error for ${senderPhone}:`, aiErr);
        }

        // After processing, check if new messages arrived while we were processing
        const { data: newMessages } = await serviceClient
          .from("message_buffer")
          .select("id")
          .eq("instance_name", instanceName)
          .eq("sender_phone", senderPhone)
          .eq("processed", false)
          .limit(1);

        if (newMessages && newMessages.length > 0) {
          console.log(`[process-sender] New messages arrived during processing for ${senderPhone}, looping...`);
          // Wait buffer delay again for new messages
          await new Promise((resolve) => setTimeout(resolve, BUFFER_DELAY_MS));
          continue;
        }

        // All done
        break;
      }
    } finally {
      // ALWAYS release the lock, even on errors
      const { error: releaseErr } = await serviceClient
        .rpc("release_sender_lock", { p_sender_id: senderPhone });

      if (releaseErr) {
        console.error(`[process-sender] Lock release error: ${releaseErr.message}`);
      } else {
        console.log(`[process-sender] Lock released for ${senderPhone}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
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
