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
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Price IDs for live and test modes
const PRICE_MAP: Record<string, { live: string; test: string }> = {
  starter: {
    live: "price_1T4S0JE3YGO6w5oCBXFikz8v",
    test: "price_1T6tafE3YGO6w5oC8iAWHVQB",
  },
  professional: {
    live: "price_1T4S1KE3YGO6w5oC23qcdMl3",
    test: "price_1T6tcYE3YGO6w5oCZZ6rAitZ",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const isTestMode = stripeKey.startsWith("sk_test_") || stripeKey.startsWith("rk_test_");
    logStep("Stripe mode", { isTestMode });

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

    const { planKey, priceId: legacyPriceId } = await req.json();
    
    // Resolve price ID: prefer planKey, fallback to legacy priceId
    let priceId: string;
    if (planKey && PRICE_MAP[planKey]) {
      priceId = isTestMode ? PRICE_MAP[planKey].test : PRICE_MAP[planKey].live;
    } else if (legacyPriceId) {
      priceId = legacyPriceId;
    } else {
      throw new Error("planKey or priceId is required");
    }
    logStep("Price ID resolved", { planKey, priceId, isTestMode });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Check if user already used trial or has active subscription
    const { data: subData } = await supabaseClient
      .from("subscriptions")
      .select("trial_end_at, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const alreadyUsedTrial = !!subData?.trial_end_at || subData?.status === "active";
    logStep("Trial check", { alreadyUsedTrial, status: subData?.status, hasTrialEnd: !!subData?.trial_end_at });

    const origin = req.headers.get("origin") || "https://paw-fect-setup.lovable.app";
    
    // Determine redirect URLs - if user is in onboarding flow, return to onboarding
    const returnTo = req.headers.get("referer")?.includes("/onboarding") ? "/onboarding" : "/my-account";
    const successUrl = `${origin}${returnTo}?checkout=success`;
    const cancelUrl = `${origin}${returnTo}?checkout=cancelled`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      payment_method_types: ["card", "boleto"],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: { user_id: user.id },
      },
      metadata: { user_id: user.id },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
