import { NextResponse } from "next/server";
import { whop, resolvePlanTier, WHOP_PLAN_MAP } from "@/lib/whop";
import { PLAN_CONFIGS } from "@/lib/ai/types";
import { createClient } from "@supabase/supabase-js";

// Use service role client for webhook handling (no user context)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event;
  try {
    event = whop.webhooks.unwrap(body, { headers });
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = getServiceClient();

  switch (event.type) {
    case "payment.succeeded": {
      const payment = event.data as unknown as Record<string, unknown>;
      const metadata = payment.metadata as Record<string, unknown> | undefined;
      const userId = metadata?.user_id as string | undefined;

      if (userId) {
        // Determine plan from the payment's plan ID
        const planId = (payment.plan as Record<string, unknown> | undefined)?.id as string | undefined;
        const tier = planId ? resolvePlanTier(planId) : "free";

        if (tier !== "free") {
          const planConfig = PLAN_CONFIGS[tier];
          const now = new Date().toISOString();

          await supabase
            .from("profiles")
            .update({
              plan: tier,
              generation_limit: planConfig.generationLimit,
              generations_used: 0,
              billing_cycle_start: now,
            } as Record<string, unknown>)
            .eq("id", userId);
        }
      }
      break;
    }

    case "membership.activated": {
      const membership = event.data as unknown as Record<string, unknown>;
      const userId = (membership.user as Record<string, unknown> | undefined)?.id as string | undefined;
      const planId = (membership.plan as Record<string, unknown> | undefined)?.id as string | undefined;

      if (userId && planId) {
        const tier = resolvePlanTier(planId);
        if (tier !== "free") {
          const planConfig = PLAN_CONFIGS[tier];
          const now = new Date().toISOString();

          await supabase
            .from("profiles")
            .update({
              plan: tier,
              generation_limit: planConfig.generationLimit,
              generations_used: 0,
              billing_cycle_start: now,
            } as Record<string, unknown>)
            .eq("id", userId);
        }
      }
      break;
    }

    case "membership.deactivated": {
      const membership = event.data as unknown as Record<string, unknown>;
      const userId = (membership.user as Record<string, unknown> | undefined)?.id as string | undefined;

      if (userId) {
        // Downgrade to free tier
        const freeConfig = PLAN_CONFIGS.free;
        await supabase
          .from("profiles")
          .update({
            plan: "free",
            generation_limit: freeConfig.generationLimit,
          } as Record<string, unknown>)
          .eq("id", userId);
      }
      break;
    }

    case "payment.failed": {
      const payment = event.data as unknown as Record<string, unknown>;
      const metadata = payment.metadata as Record<string, unknown> | undefined;
      const userId = metadata?.user_id as string | undefined;
      console.warn(`Payment failed for user ${userId}`);
      break;
    }

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}
