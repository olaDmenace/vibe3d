import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBody, updateUserSchema, apiError } from "@/lib/api/validation";

// GET /api/user — get current user profile + preferences + billing
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  // Extract billing fields (may be in profile via raw columns not in generated types yet)
  const profileAny = profile as Record<string, unknown> | null;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    display_name:
      profile?.display_name ??
      user.user_metadata?.display_name ??
      user.email?.split("@")[0] ??
      "User",
    avatar_url: profile?.avatar_url ?? null,
    preferences: profile?.preferences ?? {
      theme: "dark",
      language: "en",
      push_notifications: true,
      email_updates: false,
    },
    plan: (profileAny?.plan as string) ?? "free",
    generation_limit: (profileAny?.generation_limit as number) ?? 5,
    generations_used: (profileAny?.generations_used as number) ?? 0,
  });
}

// PUT /api/user — update profile (display_name, preferences, avatar_url)
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const result = await validateBody(request, updateUserSchema);
  if ("error" in result) return result.error;

  const body = result.data;
  const updates: Record<string, unknown> = {};

  if (body.display_name !== undefined) {
    updates.display_name = body.display_name;

    // Also sync to auth user_metadata so it's available in middleware/session
    await supabase.auth.updateUser({
      data: { display_name: body.display_name },
    });
  }

  if (body.preferences !== undefined) {
    updates.preferences = body.preferences;
  }

  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url;
  }

  if (Object.keys(updates).length === 0) {
    return apiError("No fields to update", 400, "EMPTY_UPDATE");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  return NextResponse.json(profile);
}

// DELETE /api/user — delete account and all data
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // Call the SECURITY DEFINER function that cascades through all tables
  const { error } = await supabase.rpc("delete_user_account");

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  return NextResponse.json({ success: true });
}
