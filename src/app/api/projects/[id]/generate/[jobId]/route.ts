import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkGenerationStatus,
  downloadModel,
  normalizePrompt,
  refineModel,
} from "@/lib/ai/generation-service";
import { segmentMesh } from "@/lib/three/mesh-segmenter";

/* ------------------------------------------------------------------ */
/*  Retry helper for transient Meshy failures                          */
/* ------------------------------------------------------------------ */

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 1,
  delayMs = 2000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      const isTransient =
        msg.includes("busy") || msg.includes("429") || msg.includes("503");
      if (!isTransient || attempt === maxRetries) throw lastError;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

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

  const url = new URL(request.url);
  const isRefine = url.searchParams.get("refine") === "true";

  // Check generation status (with retry for transient Meshy failures)
  const status = await withRetry(() => checkGenerationStatus(jobId), 1, 2000);

  // If complete, download and store the model, then return a Supabase signed URL
  let signedModelUrl: string | null = null;
  let meshNames: string[] = [];
  let meshCount = 0;

  if (status.status === "complete" && status.modelUrl) {
    // If this is a preview completing (not a refine), start a refine task
    if (!isRefine) {
      try {
        const refineResult = await refineModel(jobId);
        return NextResponse.json({
          status: "refining",
          progress: 0,
          previewTaskId: jobId,
          refineTaskId: refineResult.taskId,
          thumbnailUrl: status.thumbnailUrl,
        });
      } catch (refineErr) {
        // Refine failed — fall through to use the preview model
        console.warn("[generate] Refine failed, using preview model:", refineErr);
      }
    }

    const storagePath = `${user.id}/${projectId}/${jobId}.glb`;

    // Check if asset already exists for this task
    const { data: existing } = await supabase
      .from("assets")
      .select("id, storage_path, metadata")
      .eq("project_id", projectId)
      .eq("metadata->>taskId", jobId)
      .limit(1)
      .single();

    if (existing) {
      // Asset already stored — read mesh info from metadata
      const meta = existing.metadata as Record<string, unknown> | null;
      meshNames = (meta?.meshNames as string[]) ?? [];
      meshCount = (meta?.meshCount as number) ?? 0;
    } else {
      try {
        // Download the model from Meshy CDN (server-side, no CORS)
        const { buffer } = await downloadModel(status.modelUrl);

        // Get the prompt from the query string
        const prompt = url.searchParams.get("prompt") ?? "ai-model";

        // --- Mesh segmentation ---
        // Clean the prompt into a usable part-name prefix
        const promptHint = prompt
          .replace(/^(generate|create|make|build|spawn|add)\s+/i, "")
          .replace(/^(a|an|the|me a|me an)\s+/i, "")
          .replace(/^3d\s*(model\s*)?(of\s*)?/i, "")
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .trim()
          .replace(/\s+/g, "_")
          .slice(0, 30) || "Model";

        let finalBuffer: ArrayBuffer | Uint8Array = buffer;

        try {
          const segResult = await segmentMesh(buffer, promptHint);
          finalBuffer = segResult.buffer;
          meshNames = segResult.meshNames;
          meshCount = segResult.meshCount;

          if (segResult.wasSegmented) {
            console.log(
              `[generate] Segmented "${prompt}" into ${segResult.meshCount} parts: [${segResult.meshNames.join(", ")}]`
            );
          }
        } catch (segErr) {
          console.warn("[generate] Segmentation failed, using original model:", segErr);
          // Fallback — use original buffer with no mesh info
          finalBuffer = buffer;
          meshNames = [promptHint];
          meshCount = 1;
        }

        // Upload segmented (or original) model to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(storagePath, finalBuffer, {
            contentType: "model/gltf-binary",
            upsert: true,
          });

        if (uploadError) {
          console.error("[generate] Storage upload failed:", uploadError);
        } else {
          // Create asset record with mesh metadata
          const normalizedPrompt = normalizePrompt(prompt);
          await supabase.from("assets").insert({
            owner_id: user.id,
            project_id: projectId,
            name: prompt.slice(0, 100),
            file_type: "model",
            file_format: "glb",
            file_size_bytes: finalBuffer instanceof Uint8Array ? finalBuffer.byteLength : finalBuffer.byteLength,
            storage_path: storagePath,
            source: "ai_generated",
            ai_prompt: normalizedPrompt,
            metadata: {
              taskId: jobId,
              thumbnailUrl: status.thumbnailUrl,
              meshNames,
              meshCount,
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
    meshNames,
    meshCount,
    error: status.error,
  });
}
