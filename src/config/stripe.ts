// Stripe product/price mapping
// TODO: Replace these placeholder IDs with your real Stripe price IDs
// Create the products in Stripe Dashboard and paste the price_xxx IDs here

export const STRIPE_PLANS = {
  starter: {
    name: "Starter (Plano Fundador)",
    price_id: "price_1T4S0JE3YGO6w5oCBXFikz8v",
    product_id: "prod_U2X4v8ah9uiCN0",
    price: 67,
    limit: 1000,
  },
  professional: {
    name: "Profissional",
    price_id: "price_1T4S1KE3YGO6w5oC23qcdMl3",
    product_id: "prod_U2X5te6HQ2va2l",
    price: 167,
    limit: 3000,
  },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PLANS;
