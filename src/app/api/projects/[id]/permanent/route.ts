import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/validation";

/** DELETE /api/projects/[id]/permanent — permanently delete a trashed project */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // Only allow permanent deletion of already-trashed projects
  const { data: project } = await supabase
    .from("projects")
    .select("id, deleted_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .not("deleted_at", "is", null)
    .single();

  if (!project) {
    return apiError("Project not found in trash", 404, "NOT_FOUND");
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  return NextResponse.json({ success: true });
}
