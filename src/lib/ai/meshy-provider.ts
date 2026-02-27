import type {
  ModelGenerationProvider,
  GenerationResult,
  TaskStatus,
  GenOptions,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Meshy API types (v2)                                               */
/* ------------------------------------------------------------------ */

interface MeshyTextTo3DResponse {
  result: string; // task ID
}

interface MeshyTaskStatus {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  progress: number;
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
  };
  thumbnail_url?: string;
  task_error?: { message: string };
}

/* ------------------------------------------------------------------ */
/*  Meshy Provider                                                     */
/* ------------------------------------------------------------------ */

const MESHY_API_BASE = "https://api.meshy.ai/v2";

function getMeshyKey(): string {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error("MESHY_API_KEY environment variable is not set");
  return key;
}

function mapStatus(s: MeshyTaskStatus["status"]): TaskStatus["status"] {
  switch (s) {
    case "PENDING":
      return "pending";
    case "IN_PROGRESS":
      return "processing";
    case "SUCCEEDED":
      return "complete";
    case "FAILED":
    case "EXPIRED":
      return "failed";
    default:
      return "pending";
  }
}

export class MeshyProvider implements ModelGenerationProvider {
  readonly name = "meshy";

  async generateFromText(
    prompt: string,
    options?: GenOptions
  ): Promise<GenerationResult> {
    const body: Record<string, unknown> = {
      mode: "preview",
      prompt,
      ai_model: "meshy-4",
    };

    if (options?.style) {
      body.art_style = options.style;
    }

    if (options?.targetPolyCount) {
      body.target_polycount = options.targetPolyCount;
    }

    const res = await fetch(`${MESHY_API_BASE}/text-to-3d`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getMeshyKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meshy text-to-3d failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as MeshyTextTo3DResponse;

    return {
      taskId: data.result,
      status: "pending",
    };
  }

  async generateFromImage(
    imageUrl: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: GenOptions
  ): Promise<GenerationResult> {
    const res = await fetch(`${MESHY_API_BASE}/image-to-3d`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getMeshyKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        ai_model: "meshy-4",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meshy image-to-3d failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as MeshyTextTo3DResponse;

    return {
      taskId: data.result,
      status: "pending",
    };
  }

  async checkStatus(taskId: string): Promise<TaskStatus> {
    const res = await fetch(`${MESHY_API_BASE}/text-to-3d/${taskId}`, {
      headers: {
        Authorization: `Bearer ${getMeshyKey()}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meshy status check failed (${res.status}): ${err}`);
    }

    const task = (await res.json()) as MeshyTaskStatus;

    return {
      taskId: task.id,
      status: mapStatus(task.status),
      progress: task.progress ?? 0,
      modelUrl: task.model_urls?.glb,
      thumbnailUrl: task.thumbnail_url,
      error: task.task_error?.message,
    };
  }
}
