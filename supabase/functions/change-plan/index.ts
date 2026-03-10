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
  console.log(`[CHANGE-PLAN] ${step}${detailsStr}`);
};

const PRICE_MAP: Record<string, { live: string; test: string }> = {
  starter: {
    live: "price_1T4S0JE3YGO6w5oCBXFikz8v",
    test: "price_1T6tafE3YGO6w5oC8iAWHVQB",
  },
  professional: {
    live: "price_1T9PrHE3YGO6w5oCaPxPCHJt",
    test: "price_1T6tcYE3YGO6w5oCZZ6rAitZ",
  },
};

const PLAN_PRICES: Record<string, number> = {
  starter: 97,
  professional: 127,
};

const PLAN_LIMITS: Record<string, { messagesLimit: number; appointmentsLimit: number }> = {
  starter: { messagesLimit: 800, appointmentsLimit: -1 },
  professional: { messagesLimit: 1500, appointmentsLimit: -1 },
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
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { targetPlan, action } = await req.json();
    if (!targetPlan || !PRICE_MAP[targetPlan]) throw new Error("Invalid target plan");
    if (!action || !["preview", "confirm"].includes(action)) throw new Error("Invalid action");

    // Get current subscription from DB
    const { data: subData, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (subError || !subData?.[0]) throw new Error("No subscription found");
    const currentSub = subData[0];

    if (currentSub.status !== "active") throw new Error("Subscription is not active");
    if (currentSub.plan === targetPlan) throw new Error("Already on this plan");

    const currentPrice = PLAN_PRICES[currentSub.plan] || 0;
    const targetPrice = PLAN_PRICES[targetPlan] || 0;
    const isUpgrade = targetPrice > currentPrice;

    logStep("Plan change request", { current: currentSub.plan, target: targetPlan, isUpgrade, action });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found");
    const customerId = customers.data[0].id;

    // Find active Stripe subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    if (subscriptions.data.length === 0) throw new Error("No active Stripe subscription found");
    const stripeSub = subscriptions.data[0];
    const currentItem = stripeSub.items.data[0];

    const newPriceId = isTestMode ? PRICE_MAP[targetPlan].test : PRICE_MAP[targetPlan].live;

    if (isUpgrade) {
      // UPGRADE: immediate with proration
      if (action === "preview") {
        // Calculate proration preview
        const now = Math.floor(Date.now() / 1000);
        const periodEnd = stripeSub.current_period_end;
        const periodStart = stripeSub.current_period_start;
        const totalSeconds = periodEnd - periodStart;
        const remainingSeconds = periodEnd - now;
        const remainingDays = Math.ceil(remainingSeconds / 86400);
        const totalDays = Math.ceil(totalSeconds / 86400);
        const priceDiff = targetPrice - currentPrice;
        const prorationAmount = Math.round((priceDiff / totalDays) * remainingDays * 100) / 100;

        logStep("Upgrade preview", { prorationAmount, remainingDays, totalDays, priceDiff });

        return new Response(JSON.stringify({
          type: "upgrade",
          prorationAmount,
          remainingDays,
          totalDays,
          currentPlan: currentSub.plan,
          targetPlan,
          currentPrice,
          targetPrice,
          nextBillingAmount: targetPrice,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // action === "confirm" — execute upgrade
      logStep("Executing upgrade via Stripe");

      await stripe.subscriptions.update(stripeSub.id, {
        items: [
          { id: currentItem.id, price: newPriceId },
        ],
        proration_behavior: "always_invoice",
      });

      // Update DB immediately
      const limits = PLAN_LIMITS[targetPlan];
      await supabase
        .from("subscriptions")
        .update({
          plan: targetPlan,
          trial_messages_limit: limits.messagesLimit,
          trial_appointments_limit: limits.appointmentsLimit,
          trial_messages_used: 0,
          trial_appointments_used: 0,
          usage_reset_at: new Date().toISOString(),
          next_plan: null,
          next_plan_effective_at: null,
        })
        .eq("user_id", user.id);

      await supabase.from("subscription_logs").insert({
        user_id: user.id,
        action: "plan_upgrade",
        details: { from: currentSub.plan, to: targetPlan },
      });

      logStep("Upgrade completed", { from: currentSub.plan, to: targetPlan });

      return new Response(JSON.stringify({
        success: true,
        type: "upgrade",
        message: "Plano atualizado com sucesso!",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // DOWNGRADE: schedule for end of billing period
      if (action === "preview") {
        const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

        return new Response(JSON.stringify({
          type: "downgrade",
          currentPlan: currentSub.plan,
          targetPlan,
          currentPrice,
          targetPrice,
          effectiveAt: periodEnd,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // action === "confirm" — schedule downgrade (DB-only, no Stripe changes)
      // Stripe price will be updated by the webhook when the cycle renews
      logStep("Scheduling downgrade (DB-only)");

      const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

      // Store scheduled downgrade in DB
      await supabase
        .from("subscriptions")
        .update({
          next_plan: targetPlan,
          next_plan_effective_at: periodEnd,
        })
        .eq("user_id", user.id);

      await supabase.from("subscription_logs").insert({
        user_id: user.id,
        action: "plan_downgrade_scheduled",
        details: { from: currentSub.plan, to: targetPlan, effective_at: periodEnd },
      });

      logStep("Downgrade scheduled", { from: currentSub.plan, to: targetPlan, effectiveAt: periodEnd });

      return new Response(JSON.stringify({
        success: true,
        type: "downgrade",
        message: `Seu plano será alterado para ${targetPlan === "starter" ? "Essencial" : "Pro"} em ${periodEnd}.`,
        effectiveAt: periodEnd,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
