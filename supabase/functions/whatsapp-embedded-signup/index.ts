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
    const { accessToken, userId, action, wabaId: manualWabaId } = body;

    // Quick subscribe-only action (admin utility)
    if (action === "subscribe_waba" && manualWabaId) {
      const systemToken = Deno.env.get("META_SYSTEM_USER_TOKEN")!;
      const subscribeUrl = `https://graph.facebook.com/v21.0/${manualWabaId}/subscribed_apps`;
      const subscribeRes = await fetch(subscribeUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${systemToken}`,
          "Content-Type": "application/json",
        },
      });
      const subscribeData = await subscribeRes.json();
      console.log(`[EMBEDDED-SIGNUP] Subscribe WABA ${manualWabaId}:`, JSON.stringify(subscribeData));
      return new Response(
        JSON.stringify({ success: subscribeData.success ?? false, data: subscribeData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!accessToken || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing 'accessToken' or 'userId'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[EMBEDDED-SIGNUP] Processing token for userId: ${userId}`);

    const appId = Deno.env.get("META_APP_ID") || "910231245041925";
    const appSecret = Deno.env.get("META_APP_SECRET")!;

    // Step 1: Get WABA info using debug_token endpoint
    const wabaUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
    const wabaRes = await fetch(wabaUrl);
    const wabaData = await wabaRes.json();

    console.log("[EMBEDDED-SIGNUP] Debug token data:", JSON.stringify(wabaData).substring(0, 500));

    // Extract WABA ID from the granular scopes
    let wabaId: string | null = null;
    let phoneNumberId: string | null = null;

    const granularScopes = wabaData.data?.granular_scopes || [];
    for (const scope of granularScopes) {
      if (scope.scope === "whatsapp_business_management" && scope.target_ids?.length > 0) {
        wabaId = scope.target_ids[0];
      }
      if (scope.scope === "whatsapp_business_messaging" && scope.target_ids?.length > 0) {
        if (!wabaId) wabaId = scope.target_ids[0];
      }
    }

    // Step 2: If we have a WABA ID, get the phone number ID
    if (wabaId) {
      const phoneUrl = `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`;
      const phoneRes = await fetch(phoneUrl);
      const phoneData = await phoneRes.json();

      console.log("[EMBEDDED-SIGNUP] Phone numbers:", JSON.stringify(phoneData).substring(0, 300));

      if (phoneData.data && phoneData.data.length > 0) {
        phoneNumberId = phoneData.data[0].id;
      }
    }

    if (!wabaId) {
      console.error("[EMBEDDED-SIGNUP] Could not determine WABA ID");
      return new Response(
        JSON.stringify({ error: "Could not determine WhatsApp Business Account ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Register the phone number for the webhook (subscribe to messages)
    if (phoneNumberId) {
      const systemToken = Deno.env.get("META_SYSTEM_USER_TOKEN")!;
      const subscribeUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`;
      const subscribeRes = await fetch(subscribeUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${systemToken}`,
          "Content-Type": "application/json",
        },
      });
      const subscribeData = await subscribeRes.json();
      console.log("[EMBEDDED-SIGNUP] Subscribe result:", JSON.stringify(subscribeData));
    }

    // Step 4: Save the WABA info to the database
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateErr } = await serviceClient
      .from("pet_shop_configs")
      .update({
        meta_waba_id: wabaId,
        meta_phone_number_id: phoneNumberId,
        meta_access_token: accessToken,
        whatsapp_status: phoneNumberId ? "connected" : "pending",
      })
      .eq("user_id", userId);

    if (updateErr) {
      console.error("[EMBEDDED-SIGNUP] DB update error:", updateErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to save configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[EMBEDDED-SIGNUP] Saved: WABA=${wabaId}, Phone=${phoneNumberId} for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        status: phoneNumberId ? "connected" : "pending",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[EMBEDDED-SIGNUP] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
