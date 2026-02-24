// Stripe product/price mapping
// TODO: Replace these placeholder IDs with your real Stripe price IDs
// Create the products in Stripe Dashboard and paste the price_xxx IDs here

export const STRIPE_PLANS = {
  starter: {
    name: "Starter (Plano Fundador)",
    price_id: "price_STARTER_PLACEHOLDER", // Replace with real price ID
    price: 67, // R$ 67/mês
    limit: 1000,
  },
  professional: {
    name: "Profissional",
    price_id: "price_PROFESSIONAL_PLACEHOLDER", // Replace with real price ID
    price: 167, // R$ 167/mês
    limit: 3000,
  },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PLANS;
