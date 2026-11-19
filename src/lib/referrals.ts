/** Referral programme settings. Money is in pesewas, like the rest of the app. */
export const REFERRAL_DISCOUNT_MINOR = 10_00;
export const REFERRAL_REWARD_MINOR = 15_00;
export const MIN_PAYOUT_MINOR = 30_00;
/** Days a reward waits after the friend pays before it can be paid out. */
export const REWARD_HOLD_DAYS = 7;
/** Most rewards one host can earn in a calendar month. */
export const MONTHLY_REWARD_CAP = 20;
export const REFERRAL_COOKIE = "evm_ref";
export const REFERRAL_COOKIE_DAYS = 30;

const CODE = /^[A-Z0-9]{4,12}$/;
export const normaliseReferralCode = (value: string | null | undefined) => {
  const v = (value ?? "").trim().toUpperCase();
  return CODE.test(v) ? v : null;
};
