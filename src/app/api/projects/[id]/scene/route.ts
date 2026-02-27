import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBody, updateSceneSchema, apiError } from "@/lib/api/validation";

// PUT /api/projects/[id]/scene — save scene state
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

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!project) {
    return apiError("Project not found", 404, "NOT_FOUND");
  }

  const result = await validateBody(request, updateSceneSchema);
  if ("error" in result) return result.error;
  const { scene_graph: sceneGraph } = result.data;

  // Upsert the scene (update existing or create if none)
  const { data: existingScene } = await supabase
    .from("scenes")
    .select("id, version")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingScene) {
    const { data, error } = await supabase
      .from("scenes")
      .update({
        scene_graph: sceneGraph,
        version: existingScene.version + 1,
      })
      .eq("id", existingScene.id)
      .select()
      .single();

    if (error) {
      return apiError(error.message, 500, "DB_ERROR");
    }

    // Also touch the project's updated_at
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json(data);
  } else {
    const { data, error } = await supabase
      .from("scenes")
      .insert({
        project_id: id,
        scene_graph: sceneGraph,
      })
      .select()
      .single();

    if (error) {
      return apiError(error.message, 500, "DB_ERROR");
    }

    return NextResponse.json(data, { status: 201 });
  }
}
