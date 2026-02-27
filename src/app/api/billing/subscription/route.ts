import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/validation";
import { PLAN_CONFIGS, type PlanTier } from "@/lib/ai/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const plan = ((profile as Record<string, unknown> | null)?.plan as PlanTier) ?? "free";
  const planConfig = PLAN_CONFIGS[plan];
  const generationsUsed = ((profile as Record<string, unknown> | null)?.generations_used as number) ?? 0;
  const generationLimit = ((profile as Record<string, unknown> | null)?.generation_limit as number) ?? planConfig.generationLimit;
  const billingCycleStart = ((profile as Record<string, unknown> | null)?.billing_cycle_start as string) ?? null;

  return NextResponse.json({
    plan,
    planConfig,
    generationsUsed,
    generationLimit,
    billingCycleStart,
  });
}
