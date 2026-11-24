// One price, no free version: a host builds and previews a page for nothing, and pays once per
// celebration to publish it. Every page gets the same features and limits. Check them with
// `entitlements()` rather than hard-coding numbers around the codebase.

export type Entitlements = {
  maxEvents: number;
  maxPhotos: number;
  maxGuests: number;
  maxMembers: number;
  premiumThemes: boolean;
  plannerMembers: boolean;
};

const LIMITS: Entitlements = { maxEvents: 20, maxPhotos: 600, maxGuests: 1500, maxMembers: 4, premiumThemes: true, plannerMembers: true };

export function entitlements(): Entitlements {
  return LIMITS;
}

/** What publishing a celebration costs, in pesewas, paid once. */
export const PAGE_PRICE_MINOR = 69_00;
export const PAGE_PRICE_CURRENCY = "GHS";

/** The `plan` column records payment: "free" until the page is paid for, then this value. */
export const PAID_PLAN = "premium";

/** Set by an admin to let a page go live without payment. Treated as paid everywhere. */
export const COMPLIMENTARY_PLAN = "complimentary";
export const isPaidPlan = (plan: string) => plan === PAID_PLAN || plan === COMPLIMENTARY_PLAN;

/**
 * Charging is on when BILLING_ENABLED=true. Until then pages publish without payment (early access).
 */
export const billingEnabled = () => process.env.BILLING_ENABLED === "true";

/** This page can't be live until its host pays. */
export const needsPayment = (plan: string) => billingEnabled() && !isPaidPlan(plan);
