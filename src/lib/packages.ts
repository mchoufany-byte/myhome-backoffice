// Mirrors PLAN_INFO in the My Home mobile app (src/screens/PlanScreen.tsx) so the
// backoffice and client app agree on what each tier promises. visitsPerMonth is
// the quota used to judge whether a property is "on track" or "behind" -- null
// means the tier has no fixed quota (Signature is on-demand).

export type PlanTier = "Basic" | "Standard" | "Premium" | "Signature";

export const PLAN_TIERS: PlanTier[] = ["Basic", "Standard", "Premium", "Signature"];

export const PLAN_INFO: Record<
  PlanTier,
  { price: number; visitsPerMonth: number | null; blurb: string; features: string[] }
> = {
  Basic: {
    price: 100,
    visitsPerMonth: 1,
    blurb: "Essential care for a property you visit occasionally.",
    features: ["Monthly property visit", "Bill payment on your behalf", "24/7 emergency line"],
  },
  Standard: {
    price: 190,
    visitsPerMonth: 2,
    blurb: "Regular attention with more visibility into your home.",
    features: ["Biweekly property visits", "Home Journal after every visit", "Priority maintenance coordination"],
  },
  Premium: {
    price: 350,
    visitsPerMonth: 4,
    blurb: "Weekly, documented care with a dedicated point of contact.",
    features: [
      "Weekly property visits",
      "Photo & video visit reports",
      "Dedicated relationship manager",
      "Client-held or company-held key custody",
    ],
  },
  Signature: {
    price: 700,
    visitsPerMonth: null,
    blurb: "White-glove service for properties that need constant attention.",
    features: ["On-demand visits, any day", "Concierge-level requests", "Dedicated on-call coordinator"],
  },
};

export function planTierOf(value: string | null): PlanTier | null {
  return value && (PLAN_TIERS as string[]).includes(value) ? (value as PlanTier) : null;
}
