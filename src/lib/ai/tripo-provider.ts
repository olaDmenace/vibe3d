import type {
  ModelGenerationProvider,
  GenerationResult,
  TaskStatus,
  GenOptions,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Tripo API types (v2)                                               */
/* ------------------------------------------------------------------ */

interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
}

interface TripoTaskStatus {
  code: number;
  data: {
    task_id: string;
    type: string;
    status: "queued" | "running" | "success" | "failed" | "cancelled" | "unknown";
    input: Record<string, unknown>;
    output?: {
      model?: string;
      base_model?: string;
      pbr_model?: string;
      rendered_image?: string;
    };
    progress: number;
    create_time: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Tripo Provider                                                     */
/* ------------------------------------------------------------------ */

const TRIPO_API_BASE = "https://api.tripo3d.ai/v2/openapi";

function getTripoKey(): string {
  const key = process.env.TRIPO_API_KEY;
  if (!key) throw new Error("TRIPO_API_KEY environment variable is not set");
  return key;
}

function mapStatus(s: TripoTaskStatus["data"]["status"]): TaskStatus["status"] {
  switch (s) {
    case "queued":
      return "pending";
    case "running":
      return "processing";
    case "success":
      return "complete";
    case "failed":
    case "cancelled":
    case "unknown":
      return "failed";
    default:
      return "pending";
  }
}

export class TripoProvider implements ModelGenerationProvider {
  readonly name = "tripo";

  async generateFromText(
    prompt: string,
    options?: GenOptions
  ): Promise<GenerationResult> {
    const body: Record<string, unknown> = {
      type: "text_to_model",
      prompt,
    };

    if (options?.style === "cartoon" || options?.style === "low-poly") {
      body.prompt = `${prompt}, ${options.style} style`;
    }

    if (options?.targetPolyCount) {
      body.face_limit = options.targetPolyCount;
    }

    const res = await fetch(`${TRIPO_API_BASE}/task`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getTripoKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Tripo text-to-model failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as TripoTaskResponse;

    return {
      taskId: data.data.task_id,
      status: "pending",
    };
  }

  async generateFromImage(
    imageUrl: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: GenOptions
  ): Promise<GenerationResult> {
    const body: Record<string, unknown> = {
      type: "image_to_model",
      file: {
        type: "url",
        url: imageUrl,
      },
    };

    const res = await fetch(`${TRIPO_API_BASE}/task`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getTripoKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Tripo image-to-model failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as TripoTaskResponse;

    return {
      taskId: data.data.task_id,
      status: "pending",
    };
  }

  async checkStatus(taskId: string): Promise<TaskStatus> {
    const res = await fetch(`${TRIPO_API_BASE}/task/${taskId}`, {
      headers: {
        Authorization: `Bearer ${getTripoKey()}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Tripo status check failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as TripoTaskStatus;

    return {
      taskId: data.data.task_id,
      status: mapStatus(data.data.status),
      progress: data.data.progress ?? 0,
      modelUrl: data.data.output?.pbr_model || data.data.output?.model,
      thumbnailUrl: data.data.output?.rendered_image,
      error: data.data.status === "failed" ? "Tripo generation failed" : undefined,
    };
  }
}
