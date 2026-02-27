import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "model/gltf-binary": "glb",
  "model/gltf+json": "gltf",
  "application/octet-stream": "glb", // Common for GLB uploads
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/* ------------------------------------------------------------------ */
/*  GET /api/projects/[id]/assets — list project assets                */
/* ------------------------------------------------------------------ */

export async function GET(
  _request: Request,
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

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Generate signed URLs for each asset
  const assets = await Promise.all(
    (data ?? []).map(async (asset) => {
      const { data: urlData } = await supabase.storage
        .from("assets")
        .createSignedUrl(asset.storage_path, 3600); // 1 hour
      return {
        ...asset,
        url: urlData?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json(assets);
}

/* ------------------------------------------------------------------ */
/*  POST /api/projects/[id]/assets — upload a 3D model or texture      */
/* ------------------------------------------------------------------ */

const uploadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
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

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .single();

  if (!project || project.owner_id !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const nameParam = formData.get("name") as string | null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  // Validate MIME type
  const fileFormat = ALLOWED_MIME_TYPES[file.type];
  if (!fileFormat) {
    // Also check by file extension as a fallback
    const ext = file.name.split(".").pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      glb: "glb",
      gltf: "gltf",
      obj: "obj",
      fbx: "fbx",
      stl: "stl",
      png: "png",
      jpg: "jpg",
      jpeg: "jpg",
      webp: "webp",
    };
    const formatFromExt = ext ? extMap[ext] : undefined;
    if (!formatFromExt) {
      return NextResponse.json(
        { error: "Unsupported file type. Supported: GLB, GLTF, OBJ, FBX, STL, PNG, JPG, WebP" },
        { status: 400 }
      );
    }
  }

  const parsed = uploadSchema.safeParse({ name: nameParam });
  const assetName = parsed.success && parsed.data.name ? parsed.data.name : file.name;

  // Determine file type and format
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "glb";
  const format = fileFormat ?? ext;
  const fileType = ["png", "jpg", "jpeg", "webp"].includes(format) ? "texture" : "model";

  // Upload to Supabase Storage
  const assetId = crypto.randomUUID();
  const storagePath = `${user.id}/${projectId}/${assetId}.${format}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Create asset record
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      id: assetId,
      owner_id: user.id,
      project_id: projectId,
      name: assetName,
      file_type: fileType,
      file_format: format,
      file_size_bytes: file.size,
      storage_path: storagePath,
      source: "uploaded",
    })
    .select()
    .single();

  if (assetError) {
    // Clean up storage on failure
    await supabase.storage.from("assets").remove([storagePath]);
    return NextResponse.json({ error: assetError.message }, { status: 500 });
  }

  // Get signed URL
  const { data: urlData } = await supabase.storage
    .from("assets")
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json(
    { ...asset, url: urlData?.signedUrl ?? null },
    { status: 201 }
  );
}
