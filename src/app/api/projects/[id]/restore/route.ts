import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/validation";

/** POST /api/projects/[id]/restore — restore a soft-deleted project */
export async function POST(
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

  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: null } as Record<string, unknown>)
    .eq("id", id)
    .eq("owner_id", user.id)
    .not("deleted_at", "is", null);

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  return NextResponse.json({ success: true });
}
