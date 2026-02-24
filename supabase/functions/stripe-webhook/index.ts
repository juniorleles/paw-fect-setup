import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
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
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = await findUserByCustomerId(supabase, stripe, invoice.customer as string);
        if (!userId) break;

        await upsertSubscription(supabase, userId, sub);

        // Record payment history
        const amount = (invoice.amount_paid ?? 0) / 100;
        await supabase.from("payment_history").insert({
          user_id: userId,
          amount,
          status: "paid",
          description: `Fatura ${invoice.number || invoice.id}`,
          paid_at: new Date(invoice.status_transitions?.paid_at ? invoice.status_transitions.paid_at * 1000 : Date.now()).toISOString(),
        });

        logStep("invoice.paid processed", { userId });
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

async function upsertSubscription(supabase: any, userId: string, sub: Stripe.Subscription) {
  const status = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status;

  const payload = {
    status,
    current_period_start: safeTimestamp(sub.current_period_start),
    current_period_end: safeTimestamp(sub.current_period_end),
    trial_start_at: safeTimestamp(sub.trial_start),
    trial_end_at: safeTimestamp(sub.trial_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    last_payment_status: sub.status === "active" ? "paid" : null,
  };

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("subscriptions").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("subscriptions").insert({ user_id: userId, ...payload });
  }

  // Log the event
  await supabase.from("subscription_logs").insert({
    user_id: userId,
    action: `webhook_${sub.status}`,
    details: { subscription_id: sub.id, cancel_at_period_end: sub.cancel_at_period_end },
  });
}
