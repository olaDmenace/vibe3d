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

export const WHOP_PLAN_MAP: Record<string, PlanTier> = {
  // Monthly plans
  "plan_fRhaBzPCv7VO3": "standard",
  "plan_bX1vGvaf1VZ9J": "pro",
  "plan_CZwBm3Cti4ege": "mega",
  // Annual plans
  "plan_tI2nKFluSA2FQ": "standard",
  "plan_oCnzubavDuejn": "pro",
  "plan_syiJyvcdDWPrl": "mega",
};

/** Reverse lookup: tier + billing cycle → Whop plan ID */
export const TIER_TO_WHOP_PLAN: Record<string, string> = {
  "standard_monthly": "plan_fRhaBzPCv7VO3",
  "standard_annual": "plan_tI2nKFluSA2FQ",
  "pro_monthly": "plan_bX1vGvaf1VZ9J",
  "pro_annual": "plan_oCnzubavDuejn",
  "mega_monthly": "plan_CZwBm3Cti4ege",
  "mega_annual": "plan_syiJyvcdDWPrl",
};

/** Resolve a Whop plan ID to an internal plan tier */
export function resolvePlanTier(whopPlanId: string): PlanTier {
  return WHOP_PLAN_MAP[whopPlanId] ?? "free";
}

/* ------------------------------------------------------------------ */
/*  Whop Company ID                                                    */
/* ------------------------------------------------------------------ */

export const WHOP_COMPANY_ID = process.env.WHOP_COMPANY_ID || "biz_guJhAP28r0QfOA";
