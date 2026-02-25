import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const sceneGraph = body.scene_graph;

  if (!sceneGraph) {
    return NextResponse.json(
      { error: "scene_graph is required" },
      { status: 400 }
    );
  }

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
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }
}
