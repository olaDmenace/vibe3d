import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { whop, TIER_TO_WHOP_PLAN } from "@/lib/whop";
import { apiError } from "@/lib/api/validation";
import type { PlanTier } from "@/lib/ai/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  let body: { tier: PlanTier; cycle: "monthly" | "annual" };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  const { tier, cycle } = body;

  if (!tier || !cycle || tier === "free") {
    return apiError("Invalid plan tier or cycle", 400, "INVALID_PLAN");
  }

  const key = `${tier}_${cycle}`;
  const planId = TIER_TO_WHOP_PLAN[key];

  if (!planId) {
    return apiError("Plan not found", 404, "PLAN_NOT_FOUND");
  }

  try {
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutConfig = await whop.checkoutConfigurations.create({
      plan_id: planId,
      metadata: {
        user_id: user.id,
        tier,
        cycle,
      },
      redirect_url: `${origin}/dashboard?billing=success`,
      source_url: `${origin}/dashboard`,
    });

    return NextResponse.json({
      checkoutUrl: checkoutConfig.purchase_url,
      sessionId: checkoutConfig.id,
    });
  } catch (err) {
    console.error("Whop checkout error:", err);
    return apiError("Failed to create checkout session", 500, "CHECKOUT_ERROR");
  }
}
