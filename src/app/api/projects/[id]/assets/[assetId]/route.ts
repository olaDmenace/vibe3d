import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/*  GET /api/projects/[id]/assets/[assetId] — get asset with signed URL */
/* ------------------------------------------------------------------ */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const { id: projectId, assetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: asset, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const { data: urlData } = await supabase.storage
    .from("assets")
    .createSignedUrl(asset.storage_path, 3600);

  return NextResponse.json({
    ...asset,
    url: urlData?.signedUrl ?? null,
  });
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/projects/[id]/assets/[assetId] — remove asset + file   */
/* ------------------------------------------------------------------ */

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const { id: projectId, assetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch asset to get storage path
  const { data: asset } = await supabase
    .from("assets")
    .select("storage_path")
    .eq("id", assetId)
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Delete from storage
  await supabase.storage.from("assets").remove([asset.storage_path]);

  // Delete asset record
  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", assetId)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
