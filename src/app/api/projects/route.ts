import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SceneState } from "@/types/scene";

const DEFAULT_SCENE_STATE: SceneState = {
  version: 1,
  objects: {},
  lighting: {
    ambientLight: { color: "#ffffff", intensity: 0.5 },
    directionalLights: [
      {
        id: "default-dir-light",
        color: "#ffffff",
        intensity: 1,
        position: [5, 10, 5],
        castShadow: true,
      },
    ],
    pointLights: [],
  },
  camera: {
    position: [5, 5, 5],
    target: [0, 0, 0],
    fov: 50,
    near: 0.1,
    far: 1000,
  },
  environment: {
    backgroundColor: "#1a1a2e",
    showGrid: true,
    gridSize: 20,
  },
};

// GET /api/projects — list user's projects
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/projects — create a new project (+ default scene)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = body.name || "Untitled Project";

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, name })
    .select()
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: projectError?.message ?? "Failed to create project" },
      { status: 500 }
    );
  }

  // Create the default scene
  const { data: scene, error: sceneError } = await supabase
    .from("scenes")
    .insert({
      project_id: project.id,
      scene_graph: DEFAULT_SCENE_STATE as unknown as Record<string, unknown>,
    })
    .select()
    .single();

  if (sceneError) {
    // Clean up the project if scene creation fails
    await supabase.from("projects").delete().eq("id", project.id);
    return NextResponse.json({ error: sceneError.message }, { status: 500 });
  }

  return NextResponse.json({ project, scene }, { status: 201 });
}
