import { MeshyProvider } from "./meshy-provider";
import { TripoProvider } from "./tripo-provider";
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

/* ------------------------------------------------------------------ */
/*  Smart Provider Routing                                             */
/* ------------------------------------------------------------------ */

/** Keywords that suggest organic/natural shapes — route to Tripo */
const ORGANIC_KEYWORDS = [
  "animal", "bear", "bird", "bunny", "butterfly", "cat", "character",
  "creature", "dinosaur", "dog", "dragon", "elephant", "face", "figure",
  "fish", "flower", "food", "frog", "fruit", "head", "horse", "human",
  "lion", "monkey", "monster", "mushroom", "octopus", "person", "pet",
  "plant", "plush", "rabbit", "shark", "skull", "snake", "teddy",
  "tree", "troll", "unicorn", "wolf", "zombie",
];

/** Keywords that suggest hard-surface/mechanical shapes — route to Meshy */
const HARD_SURFACE_KEYWORDS = [
  "airplane", "architecture", "armor", "axe", "bike", "blade", "boat",
  "bottle", "box", "building", "bus", "cabinet", "car", "castle",
  "chair", "chest", "city", "computer", "console", "cup", "desk",
  "door", "engine", "furniture", "gadget", "gate", "gear", "gun",
  "hammer", "helmet", "house", "jet", "keyboard", "knife", "lamp",
  "machine", "mechanical", "metal", "monitor", "motorcycle", "mug",
  "phone", "pistol", "plane", "rifle", "robot", "rocket", "shelf",
  "shield", "ship", "spaceship", "sword", "table", "tank", "tool",
  "tower", "train", "truck", "turret", "vehicle", "wall", "weapon",
  "wheel", "window",
];

/**
 * Determine the best provider for a prompt based on object category.
 * - Organic/natural objects → Tripo (better at organic shapes)
 * - Hard-surface/mechanical → Meshy (better at hard-surface)
 * - Unknown → Meshy (default)
 */
export function routeProvider(prompt: string): "meshy" | "tripo" {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);

  let organicScore = 0;
  let hardSurfaceScore = 0;

  for (const word of words) {
    if (ORGANIC_KEYWORDS.some((kw) => word.includes(kw))) organicScore++;
    if (HARD_SURFACE_KEYWORDS.some((kw) => word.includes(kw))) hardSurfaceScore++;
  }

  if (hardSurfaceScore > organicScore) return "meshy";
  return "tripo";
}

/* ------------------------------------------------------------------ */
/*  Provider Registry                                                  */
/* ------------------------------------------------------------------ */

/**
 * Provider registry. Tripo is conditionally registered based on
 * whether TRIPO_API_KEY is set. Falls back to Meshy when unavailable.
 */
const providers: Record<string, ModelGenerationProvider> = {
  meshy: new MeshyProvider(),
};

// Conditionally register Tripo if API key is available
if (process.env.TRIPO_API_KEY) {
  providers.tripo = new TripoProvider();
}

/** Get list of available provider names */
export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}

function getProvider(name?: string): ModelGenerationProvider {
  const key = name ?? "tripo";

  // If requested provider isn't available, fall back to the other
  if (!providers[key]) {
    const fallback = key === "tripo" ? "meshy" : "tripo";
    if (providers[fallback]) {
      console.warn(`[generation] ${key} provider not available, falling back to ${fallback}`);
      return providers[fallback];
    }
    throw new Error(`No generation provider available (tried: ${key}, ${fallback})`);
  }
  return providers[key];
}

/**
 * Resolve which provider to use.
 * - "auto" or undefined → smart routing based on prompt
 * - "meshy" or "tripo" → use that provider (with fallback)
 */
export function resolveProvider(
  providerHint: string | undefined,
  prompt: string
): string {
  if (!providerHint || providerHint === "auto") {
    const routed = routeProvider(prompt);
    // Fall back to tripo if routed provider isn't available
    if (!providers[routed]) return providers.tripo ? "tripo" : "meshy";
    return routed;
  }
  // If explicitly requested provider isn't available, fall back
  if (!providers[providerHint]) return providers.tripo ? "tripo" : "meshy";
  return providerHint;
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
