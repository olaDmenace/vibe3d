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

  // Don't expand already detailed prompts (heuristic: > 60 chars or has adjectives)
  if (prompt.length > 60) return prompt;

  // Add 3D-specific quality modifiers
  const suffixes: string[] = [];

  // Add style hints if not already present
  if (!lower.includes("high quality") && !lower.includes("detailed")) {
    suffixes.push("high quality");
  }
  if (!lower.includes("3d model") && !lower.includes("3d render")) {
    suffixes.push("3D model");
  }
  if (!lower.includes("clean geometry") && !lower.includes("topology")) {
    suffixes.push("clean geometry");
  }

  if (suffixes.length === 0) return prompt;
  return `${prompt}, ${suffixes.join(", ")}`;
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
