import { MeshyProvider } from "./meshy-provider";
import type {
  ModelGenerationProvider,
  GenerationResult,
  TaskStatus,
  GenOptions,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Generation Service                                                 */
/*  Wraps the provider abstraction — all API routes go through this.   */
/* ------------------------------------------------------------------ */

/** Normalize a prompt for cache matching. */
export function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Expand a user's short prompt into a more detailed description
 * that produces better results from text-to-3D generation APIs.
 * Returns the enriched prompt for the API while preserving the
 * original for caching and display.
 */
export function expandPromptForGeneration(prompt: string): string {
  const lower = prompt.toLowerCase();

  // Don't expand already detailed prompts (> 80 chars)
  if (prompt.length > 80) return prompt;

  const parts: string[] = [prompt];

  // Add structural detail hints based on object category
  if (lower.includes("building") || lower.includes("house") || lower.includes("tower")) {
    parts.push("with detailed architecture, windows, doors, and roofing");
  } else if (lower.includes("car") || lower.includes("vehicle") || lower.includes("truck")) {
    parts.push("with distinct wheels, body panels, and windshield details");
  } else if (lower.includes("character") || lower.includes("person") || lower.includes("figure")) {
    parts.push("with clear body proportions, clothing details, and facial features");
  } else if (lower.includes("weapon") || lower.includes("sword") || lower.includes("gun")) {
    parts.push("with detailed handle, guard, and blade/barrel components");
  } else if (lower.includes("furniture") || lower.includes("chair") || lower.includes("table")) {
    parts.push("with realistic proportions and material textures");
  } else if (lower.includes("tree") || lower.includes("plant") || lower.includes("flower")) {
    parts.push("with natural organic shapes, branches, and foliage");
  }

  // Always add quality modifiers
  if (!lower.includes("realistic")) parts.push("realistic style");
  if (!lower.includes("detailed")) parts.push("highly detailed");
  if (!lower.includes("texture")) parts.push("with PBR textures");

  return parts.join(", ");
}

/**
 * Provider registry. The first provider is the default.
 * Future: add TripoProvider, ReplicateProvider.
 */
const providers: Record<string, ModelGenerationProvider> = {
  meshy: new MeshyProvider(),
  // tripo: new TripoProvider(),     // future: fast mode
  // replicate: new ReplicateProvider(), // future: flexibility
};

function getProvider(name?: string): ModelGenerationProvider {
  const key = name ?? "meshy";
  const provider = providers[key];
  if (!provider) throw new Error(`Unknown generation provider: ${key}`);
  return provider;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Start a text-to-3D generation.
 *
 * Flow:
 * 1. Normalize prompt
 * 2. Check cache (caller should check `assets` table for exact ai_prompt match)
 * 3. If cache miss → call provider → return task ID for polling
 *
 * Cache check is done at the API route level since it needs DB access.
 * This service handles the provider interaction only.
 */
export async function generateFromText(
  prompt: string,
  options?: GenOptions & { provider?: string }
): Promise<GenerationResult> {
  const provider = getProvider(options?.provider);
  return provider.generateFromText(prompt, options);
}

export async function generateFromImage(
  imageUrl: string,
  options?: GenOptions & { provider?: string }
): Promise<GenerationResult> {
  const provider = getProvider(options?.provider);
  return provider.generateFromImage(imageUrl, options);
}

/**
 * Start a refine task from a completed preview task.
 * Only supported by providers that implement refineModel (e.g. Meshy).
 */
export async function refineModel(
  previewTaskId: string,
  providerName?: string
): Promise<GenerationResult> {
  const provider = getProvider(providerName);
  if (!("refineModel" in provider)) {
    throw new Error(`Provider ${provider.name} does not support refinement`);
  }
  return (provider as MeshyProvider).refineModel(previewTaskId);
}

export async function checkGenerationStatus(
  taskId: string,
  providerName?: string
): Promise<TaskStatus> {
  const provider = getProvider(providerName);
  return provider.checkStatus(taskId);
}

/**
 * Download a model from a URL and return it as a Buffer.
 * Used after generation completes to store in Supabase Storage.
 */
export async function downloadModel(
  modelUrl: string
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const res = await fetch(modelUrl);
  if (!res.ok) {
    throw new Error(`Failed to download model: ${res.status}`);
  }
  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "model/gltf-binary";
  return { buffer, contentType };
}
