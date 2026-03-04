import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateBody,
  updateProjectSchema,
  apiError,
} from "@/lib/api/validation";

// GET /api/projects/[id] — get project with its scene (owner or shared user)
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
    .is("deleted_at", null)
    .single();

  if (projectError || !project) {
    return apiError("Project not found", 404, "NOT_FOUND");
  }

  // Check access: owner or shared collaborator
  if (project.owner_id !== user.id) {
    const { data: share } = await supabase
      .from("project_shares")
      .select("id")
      .eq("project_id", id)
      .eq("shared_with_id", user.id)
      .maybeSingle();

    if (!share) {
      return apiError("Project not found", 404, "NOT_FOUND");
    }
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

  // Refresh expired signed URLs for any models in the scene
  try {
    const sceneGraph = scene.scene_graph as Record<string, unknown> | null;
    const objects = (sceneGraph?.objects ?? {}) as Record<
      string,
      Record<string, unknown>
    >;

    // Collect objects that need URL refresh
    const needsRefresh: {
      objId: string;
      storagePath?: string;
      assetId?: string;
    }[] = [];

    for (const [objId, obj] of Object.entries(objects)) {
      const meta = obj.metadata as Record<string, unknown> | undefined;
      if (!meta?.modelUrl && !meta?.storagePath) continue;

      if (meta.storagePath) {
        needsRefresh.push({ objId, storagePath: meta.storagePath as string });
      } else {
        needsRefresh.push({ objId, assetId: obj.assetId as string });
      }
    }

    if (needsRefresh.length > 0) {
      // Fetch all project assets in one query to build lookup maps
      const { data: assets } = await supabase
        .from("assets")
        .select("id, storage_path, metadata")
        .eq("project_id", id);

      const byAssetId = new Map<string, string>();
      const byTaskId = new Map<string, string>();
      for (const a of assets ?? []) {
        byAssetId.set(a.id, a.storage_path);
        const tid = (a.metadata as Record<string, unknown>)?.taskId as
          | string
          | undefined;
        if (tid) byTaskId.set(tid, a.storage_path);
      }

      // Resolve storage paths and generate fresh signed URLs
      for (const item of needsRefresh) {
        let sp = item.storagePath;
        if (!sp && item.assetId) {
          if (item.assetId.startsWith("generated:")) {
            sp = byTaskId.get(item.assetId.replace("generated:", ""));
          } else {
            sp = byAssetId.get(item.assetId);
          }
        }
        if (!sp) continue;

        const { data: urlData } = await supabase.storage
          .from("assets")
          .createSignedUrl(sp, 3600);

        if (urlData?.signedUrl) {
          const meta = objects[item.objId].metadata as Record<string, unknown>;
          meta.modelUrl = urlData.signedUrl;
          meta.storagePath = sp;
        }
      }
    }
  } catch {
    // URL refresh is best-effort — don't fail the request
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

// DELETE /api/projects/[id] — soft-delete project (sets deleted_at)
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
    .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", id)
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  if (error) {
    return apiError(error.message, 500, "DB_ERROR");
  }

  return NextResponse.json({ success: true });
}
