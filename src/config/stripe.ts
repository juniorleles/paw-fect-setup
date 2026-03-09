// Stripe product/price mapping
// Live mode and Test mode price IDs

export const STRIPE_PLANS = {
  free: {
    name: "Free",
    maxAttendants: 2,
  },
  starter: {
    name: "Essencial",
    price_id_live: "price_1T4S0JE3YGO6w5oCBXFikz8v",
    price_id_test: "price_1T6tafE3YGO6w5oC8iAWHVQB",
    product_id_live: "prod_U2X4v8ah9uiCN0",
    product_id_test: "prod_U2ZxGxqNGAiwhQ",
    price: 97,
    limit: 800,
    maxAttendants: 5,
    trialMessagesLimit: 150,
    trialAppointmentsLimit: 30,
  },
  professional: {
    name: "Pro",
    price_id_live: "price_1T4S1KE3YGO6w5oC23qcdMl3",
    price_id_test: "price_1T6tcYE3YGO6w5oCZZ6rAitZ",
    product_id_live: "prod_U2X5te6HQ2va2l",
    product_id_test: "prod_U2ZxFgQ7HaugUf",
    price: 127,
    limit: 1500,
    maxAttendants: -1,
    trialMessagesLimit: 1500,
    trialAppointmentsLimit: -1,
  },
} as const;

export type StripePlanKey = keyof typeof STRIPE_PLANS;

// Plan limits config for backend reference
export const PLAN_LIMITS: Record<string, { messagesLimit: number; appointmentsLimit: number }> = {
  starter: { messagesLimit: 800, appointmentsLimit: -1 },
  professional: { messagesLimit: 1500, appointmentsLimit: -1 },
};
