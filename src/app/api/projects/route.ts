import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SceneState } from "@/types/scene";
import { PLAN_CONFIGS, type PlanTier } from "@/lib/ai/types";
import {
  validateBody,
  createProjectSchema,
  paginationSchema,
  apiError,
} from "@/lib/api/validation";

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

// GET /api/projects — list user's projects (paginated, excludes soft-deleted)
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // Parse pagination from query string
  const url = new URL(request.url);
  const parsed = paginationSchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  const { page, limit } = parsed.success
    ? parsed.data
    : { page: 1, limit: 20 };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Count total non-deleted projects for pagination metadata
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  // Fetch paginated slice
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  const total = count ?? 0;

  // Also fetch projects shared with this user (not paginated — typically few)
  const { data: sharedEntries } = await supabase
    .from("project_shares")
    .select("project_id, permission, projects:project_id(*)")
    .eq("shared_with_id", user.id);

  const sharedProjects = (sharedEntries ?? [])
    .map((entry) => {
      const project = entry.projects as unknown as Record<string, unknown> | null;
      if (!project || project.deleted_at) return null;
      return { ...project, _shared: true, _permission: entry.permission };
    })
    .filter(Boolean);

  return NextResponse.json({
    data: data ?? [],
    shared: sharedProjects,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// POST /api/projects — create a new project (+ default scene)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // Validate request body
  const result = await validateBody(request, createProjectSchema);
  if ("error" in result) return result.error;
  const { name } = result.data;

  // ---- Free tier project limit enforcement ----
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const plan = ((profile as Record<string, unknown> | null)?.plan as PlanTier) ?? "free";
  const planConfig = PLAN_CONFIGS[plan];

  if (planConfig.projectLimit !== null) {
    // Count existing non-deleted projects
    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .is("deleted_at", null);

    if (count !== null && count >= planConfig.projectLimit) {
      return apiError(
        `Project limit reached. ${planConfig.label} plan allows ${planConfig.projectLimit} project${planConfig.projectLimit > 1 ? "s" : ""}. Upgrade your plan for more.`,
        403,
        "PROJECT_LIMIT",
        {
          limit: planConfig.projectLimit,
          current: count,
          plan,
          upgrade: true,
        }
      );
    }
  }

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ owner_id: user.id, name })
    .select()
    .single();

  if (projectError || !project) {
    return apiError(
      projectError?.message ?? "Failed to create project",
      500,
      "DB_ERROR"
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
    return apiError(sceneError.message, 500, "DB_ERROR");
  }

  return NextResponse.json({ project, scene }, { status: 201 });
}
