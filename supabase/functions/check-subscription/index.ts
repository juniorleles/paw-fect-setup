import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const activeSub = subscriptions.data.find(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (!activeSub) {
      logStep("No active subscription found");

      // Sync to DB
      await supabaseClient
        .from("subscriptions")
        .update({
          status: "expired",
          last_payment_status: "none",
        })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const safeTimestamp = (ts: number | null | undefined): string | null => {
      if (ts == null || isNaN(ts)) return null;
      try { return new Date(ts * 1000).toISOString(); } catch { return null; }
    };

    const productId = activeSub.items.data[0]?.price?.product as string;
    const priceId = activeSub.items.data[0]?.price?.id;
    const subscriptionEnd = safeTimestamp(activeSub.current_period_end);
    const isTrialing = activeSub.status === "trialing";
    const trialEnd = safeTimestamp(activeSub.trial_end);

    // Map product IDs to plan names
    const PRODUCT_TO_PLAN: Record<string, string> = {
      "prod_U2X4v8ah9uiCN0": "starter",       // Essencial live
      "prod_U2ZxGxqNGAiwhQ": "starter",        // Essencial test
      "prod_U2X5te6HQ2va2l": "professional",   // Pro live
      "prod_U2ZxFgQ7HaugUf": "professional",   // Pro test
    };
    const resolvedPlan = PRODUCT_TO_PLAN[productId] || "starter";

    logStep("Active subscription found", {
      subscriptionId: activeSub.id,
      status: activeSub.status,
      productId,
      priceId,
      resolvedPlan,
      endDate: subscriptionEnd,
      trialEnd,
    });

    // Sync subscription data to Supabase
    const { data: existingSub } = await supabaseClient
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const subPayload = {
      status: "active",
      plan: resolvedPlan,
      current_period_start: safeTimestamp(activeSub.current_period_start),
      current_period_end: subscriptionEnd,
      trial_end_at: trialEnd,
      trial_start_at: safeTimestamp(activeSub.trial_start),
      last_payment_status: activeSub.latest_invoice ? "paid" : null,
      cancel_at_period_end: activeSub.cancel_at_period_end,
    };

    if (existingSub) {
      await supabaseClient
        .from("subscriptions")
        .update(subPayload)
        .eq("id", existingSub.id);
    } else {
      await supabaseClient
        .from("subscriptions")
        .insert({ user_id: user.id, ...subPayload });
    }

    logStep("Subscription synced to DB");

    return new Response(
      JSON.stringify({
        subscribed: true,
        product_id: productId,
        price_id: priceId,
        status: activeSub.status,
        subscription_end: subscriptionEnd,
        trial_end: trialEnd,
        cancel_at_period_end: activeSub.cancel_at_period_end,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
