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
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: err.message });
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const customerEmail = session.customer_details?.email;
        if (!customerEmail) {
          logStep("No customer email in checkout session");
          break;
        }

        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users?.find((u) => u.email === customerEmail);
        if (!user) {
          logStep("No user found for email", { email: customerEmail });
          break;
        }

        const subscriptionId = session.subscription as string;
        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        await upsertSubscription(supabase, user.id, sub);
        logStep("checkout.session.completed processed", { userId: user.id });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("invoice.paid details", { 
          customer: invoice.customer, 
          subscription: invoice.subscription,
          amount_paid: invoice.amount_paid,
          number: invoice.number,
        });

        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) {
          logStep("No subscription in invoice, skipping");
          break;
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = await findUserByCustomerId(supabase, stripe, invoice.customer as string);
        if (!userId) {
          logStep("No user found for customer", { customer: invoice.customer });
          break;
        }

        // Check for scheduled downgrade BEFORE upsert — apply Stripe price change
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("plan, next_plan, next_plan_effective_at")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingSub?.next_plan && existingSub?.next_plan_effective_at) {
          const effectiveAt = new Date(existingSub.next_plan_effective_at);
          if (new Date() >= effectiveAt) {
            const targetPlan = existingSub.next_plan;
            const newPriceId = PRICE_MAP[targetPlan];
            if (newPriceId) {
              const currentItem = sub.items.data[0];
              logStep("Applying Stripe downgrade", { from: existingSub.plan, to: targetPlan, newPriceId });
              await stripe.subscriptions.update(sub.id, {
                items: [{ id: currentItem.id, price: newPriceId }],
                proration_behavior: "none",
              });
            }
          }
        }

        await upsertSubscription(supabase, userId, sub);

        // Record payment history
        const amount = (invoice.amount_paid ?? (invoice as any).total ?? 0) / 100;
        const paidAtTs = invoice.status_transitions?.paid_at;
        const paidAt = paidAtTs ? new Date(paidAtTs * 1000).toISOString() : new Date().toISOString();
        
        const { error: insertError } = await supabase.from("payment_history").insert({
          user_id: userId,
          amount,
          status: "paid",
          description: `Fatura ${invoice.number || invoice.id}`,
          paid_at: paidAt,
        });

        if (insertError) {
          logStep("Error inserting payment_history", { error: insertError.message });
        }

        logStep("invoice.paid processed", { userId, amount });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await findUserByCustomerId(supabase, stripe, invoice.customer as string);
        if (!userId) break;

        await supabase
          .from("subscriptions")
          .update({ last_payment_status: "failed" })
          .eq("user_id", userId);

        logStep("invoice.payment_failed processed", { userId });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await findUserByCustomerId(supabase, stripe, sub.customer as string);
        if (!userId) break;

        await upsertSubscription(supabase, userId, sub);
        logStep("customer.subscription.updated processed", { userId, status: sub.status });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await findUserByCustomerId(supabase, stripe, sub.customer as string);
        if (!userId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancel_at_period_end: false,
          })
          .eq("user_id", userId);

        // Log cancellation
        await supabase.from("subscription_logs").insert({
          user_id: userId,
          action: "subscription_deleted_webhook",
          details: { subscription_id: sub.id },
        });

        logStep("customer.subscription.deleted processed", { userId });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    logStep("Error processing event", { type: event.type, error: err.message });
    return new Response(JSON.stringify({ error: "Webhook handler error" }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});

// --- Helper functions ---

async function findUserByCustomerId(
  supabase: any,
  stripe: Stripe,
  customerId: string
): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.email) return null;

    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u: any) => u.email === customer.email);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function safeTimestamp(ts: number | null | undefined): string | null {
  if (ts == null || isNaN(ts)) return null;
  try { return new Date(ts * 1000).toISOString(); } catch { return null; }
}

// Plan limits by plan key — -1 means unlimited
const PLAN_LIMITS: Record<string, { messagesLimit: number; appointmentsLimit: number }> = {
  starter: { messagesLimit: 800, appointmentsLimit: -1 },      // Essencial
  professional: { messagesLimit: 1500, appointmentsLimit: -1 }, // Pro
};

// Price IDs for applying downgrades on Stripe — uses test or live based on key prefix
function getPriceMap(stripeKey: string): Record<string, string> {
  const isTest = stripeKey.startsWith("sk_test_") || stripeKey.startsWith("rk_test_");
  return {
    starter: isTest ? "price_1T6tafE3YGO6w5oC8iAWHVQB" : "price_1T4S0JE3YGO6w5oCBXFikz8v",
    professional: isTest ? "price_1T6tcYE3YGO6w5oCZZ6rAitZ" : "price_1T4S1KE3YGO6w5oC23qcdMl3",
  };
}

function detectPlanFromSubscription(sub: Stripe.Subscription): string {
  const priceId = sub.items?.data?.[0]?.price?.id;
  // Map known price IDs to plan keys (live + test)
  const priceMap: Record<string, string> = {
    "price_1T4S0JE3YGO6w5oCBXFikz8v": "starter",       // Essencial live
    "price_1T6tafE3YGO6w5oC8iAWHVQB": "starter",       // Essencial test
    "price_1T4UnTE3YGO6w5oCkeqZ4Fbb": "starter",       // Essencial legacy
    "price_1T4S1KE3YGO6w5oC23qcdMl3": "professional",  // Pro live
    "price_1T6tcYE3YGO6w5oCZZ6rAitZ": "professional",  // Pro test
    "price_1T4UniE3YGO6w5oCiWyqqrfG": "professional",  // Pro legacy
  };
  return priceMap[priceId || ""] || "starter";
}

async function upsertSubscription(supabase: any, userId: string, sub: Stripe.Subscription) {
  const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;
  let plan = detectPlanFromSubscription(sub);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;

  const payload: Record<string, any> = {
    status,
    plan,
    current_period_start: safeTimestamp(sub.current_period_start),
    current_period_end: safeTimestamp(sub.current_period_end),
    trial_start_at: safeTimestamp(sub.trial_start),
    trial_end_at: safeTimestamp(sub.trial_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    last_payment_status: sub.status === "active" ? "paid" : null,
    // Set plan-specific limits
    trial_messages_limit: limits.messagesLimit,
    trial_appointments_limit: limits.appointmentsLimit,
  };

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, trial_messages_used, trial_appointments_used, plan, next_plan, next_plan_effective_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Check if there's a scheduled downgrade that should now take effect
    if (existing.next_plan && existing.next_plan_effective_at) {
      const effectiveAt = new Date(existing.next_plan_effective_at);
      const now = new Date();
      if (now >= effectiveAt) {
        logStep("Applying scheduled downgrade", { from: existing.plan, to: existing.next_plan });
        const downgradePlan = existing.next_plan;
        const downgradeLimits = PLAN_LIMITS[downgradePlan] || PLAN_LIMITS.starter;
        payload.plan = downgradePlan;
        payload.trial_messages_limit = downgradeLimits.messagesLimit;
        payload.trial_appointments_limit = downgradeLimits.appointmentsLimit;
        payload.next_plan = null;
        payload.next_plan_effective_at = null;
        payload.trial_messages_used = 0;
        payload.trial_appointments_used = 0;
        payload.usage_reset_at = new Date().toISOString();

        await supabase.from("subscription_logs").insert({
          user_id: userId,
          action: "plan_downgrade_applied",
          details: { from: existing.plan, to: downgradePlan },
        });
      }
    }

    // On plan upgrade (not downgrade), reset usage counters
    if (existing.plan !== payload.plan && !existing.next_plan) {
      payload.trial_messages_used = 0;
      payload.trial_appointments_used = 0;
      payload.usage_reset_at = new Date().toISOString();
      logStep("Plan changed, resetting counters", { from: existing.plan, to: payload.plan });
    }

    await supabase.from("subscriptions").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("subscriptions").insert({ user_id: userId, ...payload });
  }

  // Log the event
  await supabase.from("subscription_logs").insert({
    user_id: userId,
    action: `webhook_${sub.status}`,
    details: { subscription_id: sub.id, plan: payload.plan, cancel_at_period_end: sub.cancel_at_period_end },
  });
}
