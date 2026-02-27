import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { PLAN_CONFIGS, type PlanTier } from "@/lib/ai/types";

/* ------------------------------------------------------------------ */
/*  POST /api/projects/[id]/export — export scene as GLB               */
/*  Currently returns the scene graph for client-side export.          */
/*  The client uses Three.js GLTFExporter to produce the file.         */
/* ------------------------------------------------------------------ */

const exportSchema = z.object({
  format: z.enum(["glb", "gltf"]).default("glb"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user plan for format restrictions
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const plan = ((profile as Record<string, unknown> | null)?.plan as PlanTier) ?? "free";
  const planConfig = PLAN_CONFIGS[plan];

  const body = await request.json().catch(() => ({}));
  const parsed = exportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const { format } = parsed.data;

  // Check if format is allowed for this plan
  const formatUpper = format.toUpperCase();
  if (!planConfig.exportFormats.includes(formatUpper) && !planConfig.exportFormats.includes("GLB")) {
    return NextResponse.json(
      {
        error: `${formatUpper} export is not available on the ${planConfig.label} plan`,
        allowedFormats: planConfig.exportFormats,
        upgrade: true,
      },
      { status: 403 }
    );
  }

  // Get project + scene
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, name")
    .eq("id", projectId)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: scene } = await supabase
    .from("scenes")
    .select("scene_graph")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!scene) {
    return NextResponse.json({ error: "No scene found" }, { status: 404 });
  }

  // Get asset URLs for any non-primitive objects
  const sceneGraph = scene.scene_graph as Record<string, unknown>;
  const objects = (sceneGraph?.objects ?? {}) as Record<string, Record<string, unknown>>;
  const assetUrls: Record<string, string> = {};

  for (const obj of Object.values(objects)) {
    const assetId = obj.assetId as string;
    if (assetId && !assetId.startsWith("primitive:") && !assetId.startsWith("cube") && !assetId.startsWith("sphere") && !assetId.startsWith("plane") && !assetId.startsWith("cylinder") && !assetId.startsWith("cone") && !assetId.startsWith("torus")) {
      // Look up asset for signed URL
      const realId = assetId.startsWith("generated:") ? undefined : assetId;
      if (realId) {
        const { data: asset } = await supabase
          .from("assets")
          .select("storage_path")
          .eq("id", realId)
          .single();
        if (asset) {
          const { data: urlData } = await supabase.storage
            .from("assets")
            .createSignedUrl(asset.storage_path, 3600);
          if (urlData?.signedUrl) {
            assetUrls[realId] = urlData.signedUrl;
          }
        }
      }
    }
  }

  return NextResponse.json({
    projectName: project.name,
    format,
    sceneGraph: scene.scene_graph,
    assetUrls,
    watermark: planConfig.watermark,
  });
}
