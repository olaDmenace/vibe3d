import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkGenerationStatus,
  downloadModel,
} from "@/lib/ai/generation-service";
import { normalizePrompt } from "@/lib/ai/generation-service";

/* ------------------------------------------------------------------ */
/*  GET /api/projects/[id]/generate/[jobId] — poll generation status  */
/*  When generation completes, downloads the model, uploads to        */
/*  Supabase Storage, and creates an asset record.                    */
/* ------------------------------------------------------------------ */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const { id: projectId, jobId } = await params;
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

  // Check generation status
  const status = await checkGenerationStatus(jobId);

  // If complete, download and store the model, then return a Supabase signed URL
  let signedModelUrl: string | null = null;

  if (status.status === "complete" && status.modelUrl) {
    const storagePath = `${user.id}/${projectId}/${jobId}.glb`;

    // Check if asset already exists for this task
    const { data: existing } = await supabase
      .from("assets")
      .select("id, storage_path")
      .eq("project_id", projectId)
      .eq("metadata->>taskId", jobId)
      .limit(1)
      .single();

    if (!existing) {
      try {
        // Download the model from Meshy CDN (server-side, no CORS)
        const { buffer, contentType } = await downloadModel(status.modelUrl);

        // Get the prompt from the query string
        const url = new URL(request.url);
        const prompt = url.searchParams.get("prompt") ?? "ai-model";

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(storagePath, buffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error("[generate] Storage upload failed:", uploadError);
        } else {
          // Create asset record
          const normalizedPrompt = normalizePrompt(prompt);
          await supabase.from("assets").insert({
            owner_id: user.id,
            project_id: projectId,
            name: prompt.slice(0, 100),
            file_type: "model",
            file_format: "glb",
            file_size_bytes: buffer.byteLength,
            storage_path: storagePath,
            source: "ai_generated",
            ai_prompt: normalizedPrompt,
            metadata: {
              taskId: jobId,
              thumbnailUrl: status.thumbnailUrl,
            },
          });
        }
      } catch (err) {
        console.error("[generate] Download/upload failed:", err);
      }
    }

    // Generate a signed URL for the model in Supabase Storage
    const assetPath = existing?.storage_path ?? storagePath;
    const { data: urlData } = await supabase.storage
      .from("assets")
      .createSignedUrl(assetPath, 3600); // 1 hour expiry

    if (urlData?.signedUrl) {
      signedModelUrl = urlData.signedUrl;
    }
  }

  return NextResponse.json({
    taskId: status.taskId,
    status: status.status,
    progress: status.progress,
    modelUrl: signedModelUrl ?? status.modelUrl,
    thumbnailUrl: status.thumbnailUrl,
    error: status.error,
  });
}
