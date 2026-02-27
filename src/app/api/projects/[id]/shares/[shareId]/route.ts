import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateBody,
  updateShareSchema,
  apiError,
} from "@/lib/api/validation";

/* ------------------------------------------------------------------ */
/*  PUT /api/projects/[id]/shares/[shareId] — update permission        */
/* ------------------------------------------------------------------ */

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  const { id: projectId, shareId } = await params;
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

  const validated = await validateBody(request, updateShareSchema);
  if ("error" in validated) return validated.error;
  const { permission } = validated.data;

  const { data: share, error } = await supabase
    .from("project_shares")
    .update({ permission })
    .eq("id", shareId)
    .eq("project_id", projectId)
    .select()
    .single();

  if (error || !share) {
    return apiError("Share not found", 404, "NOT_FOUND");
  }

  return NextResponse.json({ share });
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/projects/[id]/shares/[shareId] — remove collaborator   */
/* ------------------------------------------------------------------ */

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  const { id: projectId, shareId } = await params;
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

  const { error } = await supabase
    .from("project_shares")
    .delete()
    .eq("id", shareId)
    .eq("project_id", projectId);

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  return NextResponse.json({ success: true });
}
