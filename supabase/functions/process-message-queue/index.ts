import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUFFER_DELAY_MS = 8000; // Only process messages older than 8 seconds

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find distinct (instance_name, sender_phone) pairs with unprocessed messages
    // that are older than BUFFER_DELAY_MS (i.e., the sender has stopped typing)
    const cutoff = new Date(Date.now() - BUFFER_DELAY_MS).toISOString();

    const { data: pendingGroups, error: groupErr } = await serviceClient
      .from("message_buffer")
      .select("instance_name, sender_phone")
      .eq("processed", false)
      .lte("created_at", cutoff);

    if (groupErr) {
      console.error("Error querying pending groups:", groupErr.message);
      return new Response(JSON.stringify({ error: groupErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingGroups || pendingGroups.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate groups (same instance + phone)
    const uniqueGroups = new Map<string, { instance_name: string; sender_phone: string }>();
    for (const g of pendingGroups) {
      const key = `${g.instance_name}::${g.sender_phone}`;
      if (!uniqueGroups.has(key)) {
        uniqueGroups.set(key, { instance_name: g.instance_name, sender_phone: g.sender_phone });
      }
    }

    // Check if there are any NEWER unprocessed messages (within buffer window)
    // If so, skip that group — the sender is still typing
    let processedCount = 0;

    for (const [, group] of uniqueGroups) {
      const { data: recentMessages } = await serviceClient
        .from("message_buffer")
        .select("id")
        .eq("instance_name", group.instance_name)
        .eq("sender_phone", group.sender_phone)
        .eq("processed", false)
        .gt("created_at", cutoff)
        .limit(1);

      if (recentMessages && recentMessages.length > 0) {
        // Sender still typing, skip this group for now
        console.log(`Skipping ${group.sender_phone} — still typing`);
        continue;
      }

      // Atomically claim ALL pending messages from this sender
      const { data: claimed, error: claimErr } = await serviceClient
        .from("message_buffer")
        .update({ processed: true })
        .eq("instance_name", group.instance_name)
        .eq("sender_phone", group.sender_phone)
        .eq("processed", false)
        .select("id, content, created_at")
        .order("created_at", { ascending: true });

      if (claimErr) {
        console.error(`Claim error for ${group.sender_phone}:`, claimErr.message);
        continue;
      }

      if (!claimed || claimed.length === 0) {
        console.log(`No messages to claim for ${group.sender_phone} — already processed`);
        continue;
      }

      // Combine messages
      const combinedMessage = claimed.map((m: any) => m.content).join("\n");
      console.log(`Processing ${claimed.length} messages from ${group.sender_phone}: ${combinedMessage.substring(0, 200)}`);

      // Forward to AI handler
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      try {
        const aiRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-handler`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceName: group.instance_name,
            message: combinedMessage,
            senderPhone: group.sender_phone,
          }),
        });
        console.log(`AI handler response for ${group.sender_phone}:`, aiRes.status);
      } catch (aiErr) {
        console.error(`AI handler call error for ${group.sender_phone}:`, aiErr);
      }

      processedCount++;
    }

    // Cleanup old processed buffer entries (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await serviceClient
      .from("message_buffer")
      .delete()
      .eq("processed", true)
      .lt("created_at", oneHourAgo);

    console.log(`Queue processed: ${processedCount} groups`);

    return new Response(JSON.stringify({ ok: true, processed: processedCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Queue worker error:", err);
    return new Response(JSON.stringify({ error: "Queue processing error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
