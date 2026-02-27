import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateFromText,
  normalizePrompt,
} from "@/lib/ai/generation-service";
import { PLAN_CONFIGS, type PlanTier } from "@/lib/ai/types";
import { validateBody, generateSchema, apiError } from "@/lib/api/validation";

/* ------------------------------------------------------------------ */
/*  POST /api/projects/[id]/generate — start a text-to-3D generation  */
/* ------------------------------------------------------------------ */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .single();

  if (!project || project.owner_id !== user.id) {
    return apiError("Project not found", 404, "NOT_FOUND");
  }

  const result = await validateBody(request, generateSchema);
  if ("error" in result) return result.error;
  const { prompt, style } = result.data;

  // ---- Rate limit check ----
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const plan = ((profile as Record<string, unknown>)?.plan as PlanTier) ?? "free";
  const generationsUsed = ((profile as Record<string, unknown>)?.generations_used as number) ?? 0;
  const billingCycleStart = ((profile as Record<string, unknown>)?.billing_cycle_start as string) ?? null;
  const planConfig = PLAN_CONFIGS[plan];

  // Check if billing cycle needs reset (monthly)
  if (billingCycleStart) {
    const cycleStart = new Date(billingCycleStart);
    const now = new Date();
    const monthDiff =
      (now.getFullYear() - cycleStart.getFullYear()) * 12 +
      (now.getMonth() - cycleStart.getMonth());
    if (monthDiff >= 1) {
      // Reset generation count
      await supabase
        .from("profiles")
        .update({
          generations_used: 0,
          billing_cycle_start: now.toISOString(),
        } as Record<string, unknown>)
        .eq("id", user.id);
    }
  }

  if (generationsUsed >= planConfig.generationLimit) {
    return NextResponse.json(
      {
        error: "Generation limit reached",
        limit: planConfig.generationLimit,
        used: generationsUsed,
        plan,
        upgrade: plan !== "mega",
      },
      { status: 429 }
    );
  }

  // ---- Cache check ----
  const normalizedPrompt = normalizePrompt(prompt);

  const { data: cached } = await supabase
    .from("assets")
    .select("id, storage_path, name, metadata")
    .eq("project_id", projectId)
    .eq("ai_prompt", normalizedPrompt)
    .eq("source", "ai_generated")
    .limit(1)
    .single();

  if (cached) {
    return NextResponse.json({
      cached: true,
      asset: cached,
    });
  }

  // ---- Start generation ----
  try {
    const result = await generateFromText(prompt, {
      style,
      provider: "meshy",
    });

    // Increment generation count
    await supabase
      .from("profiles")
      .update({
        generations_used: generationsUsed + 1,
      } as Record<string, unknown>)
      .eq("id", user.id);

    return NextResponse.json({
      cached: false,
      taskId: result.taskId,
      status: result.status,
      prompt: normalizedPrompt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
