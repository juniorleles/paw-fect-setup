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
    let { accessToken, action, wabaId: manualWabaId, code } = body;

    // Extract authenticated user ID from JWT (ignore client-sent userId)
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        authenticatedUserId = payload.sub || null;
      } catch {
        // JWT decode failed, will fall back below
      }
    }

    // For admin utility actions, allow without JWT user
    // Quick subscribe-only action (admin utility)
    if (action === "subscribe_waba" && manualWabaId) {
      const systemToken = Deno.env.get("META_SYSTEM_USER_TOKEN")!;
      
      // If phoneNumberId provided, look up the WABA first
      if (body.phoneNumberId) {
        const lookupUrl = `https://graph.facebook.com/v21.0/${body.phoneNumberId}?fields=id,display_phone_number&access_token=${systemToken}`;
        const lookupRes = await fetch(lookupUrl);
        const lookupData = await lookupRes.json();
        console.log(`[EMBEDDED-SIGNUP] Phone lookup:`, JSON.stringify(lookupData));
      }
      
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
    
    // Lookup WABA from phone number ID
    if (action === "lookup_waba") {
      const systemToken = Deno.env.get("META_SYSTEM_USER_TOKEN")!;
      const results: Record<string, unknown> = {};
      
      if (body.phoneNumberId) {
        const url = `https://graph.facebook.com/v21.0/${body.phoneNumberId}?fields=id,display_phone_number,name_status,quality_rating&access_token=${systemToken}`;
        const res = await fetch(url);
        results.phone = await res.json();
      }
      
      // List WABAs owned by business
      if (body.businessId) {
        const url = `https://graph.facebook.com/v21.0/${body.businessId}/owned_whatsapp_business_accounts?access_token=${systemToken}`;
        const res = await fetch(url);
        results.wabas = await res.json();
      }

      // Inspect a specific WABA directly: phone numbers + ownership info
      if (body.wabaId) {
        const infoUrl = `https://graph.facebook.com/v21.0/${body.wabaId}?fields=id,name,currency,timezone_id,message_template_namespace,owner_business_info,on_behalf_of_business_info,account_review_status&access_token=${systemToken}`;
        const infoRes = await fetch(infoUrl);
        results.wabaInfo = await infoRes.json();

        const phUrl = `https://graph.facebook.com/v21.0/${body.wabaId}/phone_numbers?access_token=${systemToken}`;
        const phRes = await fetch(phUrl);
        results.wabaPhones = await phRes.json();

        const subUrl = `https://graph.facebook.com/v21.0/${body.wabaId}/subscribed_apps?access_token=${systemToken}`;
        const subRes = await fetch(subUrl);
        results.wabaSubs = await subRes.json();
      }
      
      // List WABAs shared with app
      const appId = "1335266151850577";
      const appSecret = Deno.env.get("META_APP_SECRET")!;
      const appToken = `${appId}|${appSecret}`;
      
      // Try to get phone number's WABA via the whatsapp_business_account edge
      if (body.phoneNumberId) {
        const wabaEdgeUrl = `https://graph.facebook.com/v21.0/${body.phoneNumberId}/whatsapp_business_account?access_token=${systemToken}`;
        const wabaEdgeRes = await fetch(wabaEdgeUrl);
        results.phoneWaba = await wabaEdgeRes.json();
      }
      
      console.log(`[EMBEDDED-SIGNUP] Lookup:`, JSON.stringify(results));
      return new Response(
        JSON.stringify(results),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For the main signup flow, require JWT user and accessToken (or code)
    const userId = authenticatedUserId;
    if ((!accessToken && !code) || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing 'accessToken' or 'code' or authenticated user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[EMBEDDED-SIGNUP] Processing for authenticated userId: ${userId} (mode: ${code ? 'code' : 'token'})`);

    const appId = Deno.env.get("META_APP_ID") || "1335266151850577";
    const appSecret = Deno.env.get("META_APP_SECRET")!;

    // If we received a code (Embedded Signup with response_type=code), exchange it for an access token
    if (code && !accessToken) {
      const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`;
      const exchangeRes = await fetch(exchangeUrl);
      const exchangeData = await exchangeRes.json();
      if (!exchangeData.access_token) {
        console.error("[EMBEDDED-SIGNUP] Code-for-token exchange failed:", JSON.stringify(exchangeData));
        return new Response(
          JSON.stringify({ error: "Failed to exchange code for access token", details: exchangeData }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      accessToken = exchangeData.access_token;
      console.log(`[EMBEDDED-SIGNUP] Code exchanged for access token successfully`);
    }

    // Step 1: Get WABA info using debug_token endpoint
    const wabaUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
    const wabaRes = await fetch(wabaUrl);
    const wabaData = await wabaRes.json();

    console.log("[EMBEDDED-SIGNUP] Debug token data:", JSON.stringify(wabaData).substring(0, 500));

    // Extract ALL candidate WABA IDs from granular scopes
    // The user may have multiple WABAs in their Business Manager — we must scan ALL of them
    // and pick the one that actually has a connected phone number, not just target_ids[0].
    const candidateWabaIds = new Set<string>();
    const granularScopes = wabaData.data?.granular_scopes || [];
    for (const scope of granularScopes) {
      if (
        (scope.scope === "whatsapp_business_management" ||
          scope.scope === "whatsapp_business_messaging") &&
        Array.isArray(scope.target_ids)
      ) {
        for (const id of scope.target_ids) candidateWabaIds.add(id);
      }
    }

    console.log(
      `[EMBEDDED-SIGNUP] Candidate WABAs from token (${candidateWabaIds.size}):`,
      [...candidateWabaIds].join(", ")
    );

    // Step 2: Iterate ALL candidate WABAs and pick the first one with a phone number.
    // This fixes the bug where users with multiple WABAs got the wrong (empty) one selected.
    let wabaId: string | null = null;
    let phoneNumberId: string | null = null;
    let firstWabaWithoutPhone: string | null = null;

    for (const candidate of candidateWabaIds) {
      const phoneUrl = `https://graph.facebook.com/v21.0/${candidate}/phone_numbers?access_token=${accessToken}`;
      const phoneRes = await fetch(phoneUrl);
      const phoneData = await phoneRes.json();

      console.log(
        `[EMBEDDED-SIGNUP] WABA ${candidate} phones:`,
        JSON.stringify(phoneData).substring(0, 300)
      );

      if (phoneData?.data && phoneData.data.length > 0) {
        wabaId = candidate;
        phoneNumberId = phoneData.data[0].id;
        console.log(
          `[EMBEDDED-SIGNUP] ✅ Selected WABA ${wabaId} with phone ${phoneNumberId}`
        );
        break;
      } else if (!firstWabaWithoutPhone) {
        firstWabaWithoutPhone = candidate;
      }
    }

    // Fallback: if no WABA had a phone, keep the first candidate so we can still save state
    if (!wabaId && firstWabaWithoutPhone) {
      wabaId = firstWabaWithoutPhone;
      console.warn(
        `[EMBEDDED-SIGNUP] ⚠️ No WABA had phone numbers. Falling back to ${wabaId} with status=pending`
      );
    }

    if (!wabaId) {
      console.error("[EMBEDDED-SIGNUP] Could not determine WABA ID");
      return new Response(
        JSON.stringify({ error: "Could not determine WhatsApp Business Account ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemToken = Deno.env.get("META_SYSTEM_USER_TOKEN")!;
    const systemUserId = Deno.env.get("META_SYSTEM_USER_ID");
    const extendedCreditId = Deno.env.get("META_EXTENDED_CREDIT_ID");

    // Step 3: Register the phone number for the webhook (subscribe to messages)
    if (phoneNumberId) {
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

    // Step 3b (Model B): Assign system user to WABA + attach MagicZap credit line
    // Only runs when both META_SYSTEM_USER_ID and META_EXTENDED_CREDIT_ID are configured.
    // Failures here do NOT block the connection — client stays in Model A fallback.
    let creditAttached = false;
    if (systemUserId && extendedCreditId && wabaId) {
      try {
        // 3b.1 — Assign the System User as MANAGE on the client's WABA
        const assignUrl = `https://graph.facebook.com/v21.0/${wabaId}/assigned_users?user=${systemUserId}&tasks=["MANAGE"]&access_token=${systemToken}`;
        const assignRes = await fetch(assignUrl, { method: "POST" });
        const assignData = await assignRes.json();
        console.log("[EMBEDDED-SIGNUP] Assign system user result:", JSON.stringify(assignData));

        // 3b.2 — Attach MagicZap's Extended Credit Line as the payer for this WABA
        const attachUrl = `https://graph.facebook.com/v21.0/${extendedCreditId}/whatsapp_credit_sharing_and_attach`;
        const attachRes = await fetch(attachUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${systemToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ waba_id: wabaId, waba_currency: "USD" }),
        });
        const attachData = await attachRes.json();
        console.log("[EMBEDDED-SIGNUP] Credit attach result:", JSON.stringify(attachData));

        // Meta returns { allocation_config_id: "..." } on success
        if (attachData.allocation_config_id || attachData.success === true) {
          creditAttached = true;
          console.log(`[EMBEDDED-SIGNUP] ✅ Model B active for WABA ${wabaId} (MagicZap pays)`);
        } else {
          console.warn(`[EMBEDDED-SIGNUP] ⚠️ Credit attach failed, falling back to Model A. Response:`, JSON.stringify(attachData));
        }
      } catch (creditErr) {
        console.error("[EMBEDDED-SIGNUP] Credit attach error (non-blocking):", creditErr);
      }
    } else {
      console.log("[EMBEDDED-SIGNUP] Model B skipped (missing META_SYSTEM_USER_ID or META_EXTENDED_CREDIT_ID). Running in Model A.");
    }

    // Step 4: Exchange short-lived token for a long-lived token (60 days)
    let finalToken = accessToken;
    try {
      const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`;
      const exchangeRes = await fetch(exchangeUrl);
      const exchangeData = await exchangeRes.json();
      if (exchangeData.access_token) {
        finalToken = exchangeData.access_token;
        console.log(`[EMBEDDED-SIGNUP] Token exchanged for long-lived token (expires_in: ${exchangeData.expires_in || 'unknown'})`);
      } else {
        console.warn("[EMBEDDED-SIGNUP] Token exchange failed, using original token:", JSON.stringify(exchangeData));
      }
    } catch (exchangeErr) {
      console.warn("[EMBEDDED-SIGNUP] Token exchange error, using original:", exchangeErr);
    }

    // Step 5: Save the WABA info to the database
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateErr } = await serviceClient
      .from("pet_shop_configs")
      .update({
        meta_waba_id: wabaId,
        meta_phone_number_id: phoneNumberId,
        meta_access_token: finalToken,
        whatsapp_status: phoneNumberId ? "connected" : "pending",
        meta_credit_attached: creditAttached,
        meta_credit_attached_at: creditAttached ? new Date().toISOString() : null,
      })
      .eq("user_id", userId);

    if (updateErr) {
      console.error("[EMBEDDED-SIGNUP] DB update error:", updateErr.message);
      return new Response(
        JSON.stringify({ error: "Failed to save configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[EMBEDDED-SIGNUP] Saved: WABA=${wabaId}, Phone=${phoneNumberId}, CreditAttached=${creditAttached} for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        status: phoneNumberId ? "connected" : "pending",
        credit_attached: creditAttached,
        billing_model: creditAttached ? "B" : "A",
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
