import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateBody,
  createShareSchema,
  apiError,
} from "@/lib/api/validation";

/* ------------------------------------------------------------------ */
/*  GET /api/projects/[id]/shares — list collaborators                 */
/* ------------------------------------------------------------------ */

export async function GET(
  _request: Request,
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
    .is("deleted_at", null)
    .single();

  if (!project || project.owner_id !== user.id) {
    return apiError("Project not found", 404, "NOT_FOUND");
  }

  // Fetch shares with profile info for each collaborator
  const { data: shares, error } = await supabase
    .from("project_shares")
    .select("id, permission, created_at, shared_with_id, profiles:shared_with_id(id, display_name, avatar_url)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  return NextResponse.json({ shares: shares ?? [] });
}

/* ------------------------------------------------------------------ */
/*  POST /api/projects/[id]/shares — add a collaborator by email       */
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
    .is("deleted_at", null)
    .single();

  if (!project || project.owner_id !== user.id) {
    return apiError("Project not found", 404, "NOT_FOUND");
  }

  const validated = await validateBody(request, createShareSchema);
  if ("error" in validated) return validated.error;
  const { email, permission } = validated.data;

  // Look up the user by email in profiles via auth
  // We need to find the user ID from the email — query auth.users isn't
  // accessible via client SDK, so we look up profiles that have a matching
  // identity. For now, we use a workaround: look for profiles where the
  // user signed up with this email. We'll query profiles and check.
  // Since we can't directly query auth.users, we'll use a manual approach:
  // the caller provides an email and we look for a profile whose id matches
  // an auth user with that email.

  // Use RPC or a direct approach — for security, let's look up via
  // the admin API if available, otherwise check if we can match.
  // Simplest approach: look for existing shares or use email in user_metadata.

  // For now, we'll use the supabase admin client to look up users by email.
  // Since we're on the server, we can use the service role key if available.
  // Fallback: return an error if the user can't be found.

  // Try to find the target user — search auth.users by email
  // This requires service_role access. If not available, we check profiles.
  const { data: targetProfiles } = await supabase
    .rpc("get_user_id_by_email", { target_email: email }) as { data: { id: string }[] | null };

  let targetUserId: string | null = null;

  if (targetProfiles && targetProfiles.length > 0) {
    targetUserId = targetProfiles[0].id;
  } else {
    // Fallback: look up by checking if there's a profile display_name match
    // This won't work reliably. Return a helpful error.
    return apiError(
      "No user found with that email. They must have a Vibe3D account first.",
      404,
      "USER_NOT_FOUND"
    );
  }

  // Prevent sharing with yourself
  if (targetUserId === user.id) {
    return apiError("Cannot share a project with yourself", 400, "SELF_SHARE");
  }

  // Check if already shared with this user
  const { data: existing } = await supabase
    .from("project_shares")
    .select("id")
    .eq("project_id", projectId)
    .eq("shared_with_id", targetUserId)
    .maybeSingle();

  if (existing) {
    return apiError("Project already shared with this user", 409, "ALREADY_SHARED");
  }

  // Create the share
  const { data: share, error } = await supabase
    .from("project_shares")
    .insert({
      project_id: projectId,
      shared_with_id: targetUserId,
      permission,
    })
    .select()
    .single();

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  // Send invite email (fire-and-forget)
  try {
    const { sendInviteEmail } = await import("@/lib/email/send-invite");
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    const inviterName = ownerProfile?.display_name || "Someone";
    const { data: projectInfo } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();
    const origin = request.headers.get("origin") || "https://vibe3d.app";
    sendInviteEmail({
      to: email,
      inviterName,
      projectName: projectInfo?.name || "Untitled Project",
      permission,
      acceptUrl: `${origin}/editor/${projectId}`,
    });
  } catch (emailErr) {
    console.error("[shares] Failed to send invite email:", emailErr);
  }

  return NextResponse.json({ share }, { status: 201 });
}
