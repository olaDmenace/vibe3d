import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateBody,
  updateProjectSchema,
  apiError,
} from "@/lib/api/validation";

// GET /api/projects/[id] — get project with its scene
export async function GET(
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

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError || !project) {
    return apiError("Project not found", 404, "NOT_FOUND");
  }

  const { data: scene, error: sceneError } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (sceneError) {
    return apiError(sceneError.message, 500, "DB_ERROR");
  }

  return NextResponse.json({ project, scene });
}

// PUT /api/projects/[id] — update project metadata
export async function PUT(
  request: Request,
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

  const result = await validateBody(request, updateProjectSchema);
  if ("error" in result) return result.error;

  const updates = result.data;
  if (Object.keys(updates).length === 0) {
    return apiError("No fields to update", 400, "EMPTY_UPDATE");
  }

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  return NextResponse.json(data);
}

// DELETE /api/projects/[id] — delete project
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
