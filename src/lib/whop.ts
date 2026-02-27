import Whop from "@whop/sdk";
import type { PlanTier } from "@/lib/ai/types";

/* ------------------------------------------------------------------ */
/*  Whop SDK client                                                    */
/* ------------------------------------------------------------------ */

export const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY,
});

/* ------------------------------------------------------------------ */
/*  Plan ↔ Whop ID mapping                                            */
/* ------------------------------------------------------------------ */

// TODO: Replace with actual Whop plan IDs from dashboard
export const WHOP_PLAN_MAP: Record<string, PlanTier> = {
  // Monthly plans
  "plan_STANDARD_MONTHLY": "standard",
  "plan_PRO_MONTHLY": "pro",
  "plan_MEGA_MONTHLY": "mega",
  // Annual plans
  "plan_STANDARD_ANNUAL": "standard",
  "plan_PRO_ANNUAL": "pro",
  "plan_MEGA_ANNUAL": "mega",
};

/** Reverse lookup: tier + billing cycle → Whop plan ID */
// TODO: Replace with actual Whop plan IDs from dashboard
export const TIER_TO_WHOP_PLAN: Record<string, string> = {
  "standard_monthly": "plan_STANDARD_MONTHLY",
  "standard_annual": "plan_STANDARD_ANNUAL",
  "pro_monthly": "plan_PRO_MONTHLY",
  "pro_annual": "plan_PRO_ANNUAL",
  "mega_monthly": "plan_MEGA_MONTHLY",
  "mega_annual": "plan_MEGA_ANNUAL",
};

/** Resolve a Whop plan ID to an internal plan tier */
export function resolvePlanTier(whopPlanId: string): PlanTier {
  return WHOP_PLAN_MAP[whopPlanId] ?? "free";
}

/* ------------------------------------------------------------------ */
/*  Whop Company ID                                                    */
/* ------------------------------------------------------------------ */

// TODO: Replace with actual Whop company ID from dashboard
export const WHOP_COMPANY_ID = process.env.WHOP_COMPANY_ID || "biz_XXXXX";
