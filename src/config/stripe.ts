// Stripe product/price mapping
// Live mode and Test mode price IDs

export const STRIPE_PLANS = {
  starter: {
    name: "Starter (Plano Fundador)",
    price_id_live: "price_1T4S0JE3YGO6w5oCBXFikz8v",
    price_id_test: "price_1T4UnTE3YGO6w5oCkeqZ4Fbb",
    product_id_live: "prod_U2X4v8ah9uiCN0",
    product_id_test: "prod_U2ZxFgQ7HaugUf",
    price: 67,
    limit: 1000,
  },
  professional: {
    name: "Profissional",
    price_id_live: "price_1T4S1KE3YGO6w5oC23qcdMl3",
    price_id_test: "price_1T4UniE3YGO6w5oCiWyqqrfG",
    product_id_live: "prod_U2X5te6HQ2va2l",
    product_id_test: "prod_U2ZxGxqNGAiwhQ",
    price: 167,
    limit: 3000,
  },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PLANS;
