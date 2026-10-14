// Plan entitlements, defined in one place. Check features with `entitlements(plan)` rather than
// comparing plan names around the codebase. Limits are product hypotheses and easy to change here.

export type PlanId = "free" | "premium";

export type Entitlements = {
  maxEvents: number;
  maxPhotos: number;
  maxGuests: number;
  maxMembers: number;
  premiumThemes: boolean;
  plannerMembers: boolean;
};

const PLANS: Record<PlanId, Entitlements> = {
  free: { maxEvents: 3, maxPhotos: 40, maxGuests: 150, maxMembers: 2, premiumThemes: false, plannerMembers: false },
  premium: { maxEvents: 20, maxPhotos: 600, maxGuests: 1500, maxMembers: 4, premiumThemes: true, plannerMembers: true },
};

/**
 * Billing is not implemented yet. Until BILLING_ENABLED=true, every celebration gets premium entitlements
 * (a launch period), so no feature is blocked behind a payment flow that doesn't exist.
 */
export const billingEnabled = () => process.env.BILLING_ENABLED === "true";

export function entitlements(plan: string): Entitlements {
  if (!billingEnabled()) return PLANS.premium;
  return PLANS[(plan as PlanId) in PLANS ? (plan as PlanId) : "free"];
}

export const PLAN_LIST = PLANS;
