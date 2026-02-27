import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/validation";

/** GET /api/projects/trash — list soft-deleted projects */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, thumbnail_url, deleted_at")
    .eq("owner_id", user.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  return NextResponse.json({ data: data ?? [] });
}
