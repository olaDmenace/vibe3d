/* ------------------------------------------------------------------ */
/*  Provider-agnostic 3D generation types                              */
/* ------------------------------------------------------------------ */

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface GenOptions {
  /** Art style hint (e.g. "realistic", "cartoon", "low-poly") */
  style?: string;
  /** Target polygon budget */
  targetPolyCount?: number;
  /** Whether to generate PBR textures */
  generateTextures?: boolean;
}

export type TaskStatusValue = "pending" | "processing" | "complete" | "failed";

export interface GenerationResult {
  taskId: string;
  status: TaskStatusValue;
  modelUrl?: string;
  thumbnailUrl?: string;
  progress?: number; // 0–100
  metadata?: {
    vertexCount: number;
    materialCount: number;
    boundingBox: BoundingBox;
  };
  error?: string;
}

export interface TaskStatus {
  taskId: string;
  status: TaskStatusValue;
  progress: number;
  modelUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Provider-agnostic interface for 3D model generation.
 * Implementations: MeshyProvider, (future: TripoProvider, ReplicateProvider)
 */
export interface ModelGenerationProvider {
  readonly name: string;
  generateFromText(prompt: string, options?: GenOptions): Promise<GenerationResult>;
  generateFromImage(imageUrl: string, options?: GenOptions): Promise<GenerationResult>;
  checkStatus(taskId: string): Promise<TaskStatus>;
}

/* ------------------------------------------------------------------ */
/*  Billing plan types                                                 */
/* ------------------------------------------------------------------ */

export type PlanTier = "free" | "standard" | "pro" | "mega";

export interface PlanConfig {
  tier: PlanTier;
  label: string;
  monthlyPrice: number;
  annualPrice: number;
  generationLimit: number;
  features: string[];
  exportFormats: string[];
  watermark: boolean;
  projectLimit: number | null; // null = unlimited
  seats: number;
  apiAccess: boolean;
  apiRequestLimit: number | null;
  prioritySpeed: string;
  support: string;
  commercialLicense: boolean;
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: "free",
    label: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    generationLimit: 5,
    features: [
      "5 AI generations/month",
      "Watermarked exports",
      "GLB export only",
      "Personal use only",
      "Community support",
      "1 project",
      "Standard generation speed",
    ],
    exportFormats: ["GLB"],
    watermark: true,
    projectLimit: 1,
    seats: 1,
    apiAccess: false,
    apiRequestLimit: null,
    prioritySpeed: "standard",
    support: "community",
    commercialLicense: false,
  },
  standard: {
    tier: "standard",
    label: "Standard",
    monthlyPrice: 30,
    annualPrice: 288,
    generationLimit: 75,
    features: [
      "75 AI generations/month",
      "No watermarks",
      "All export formats",
      "Commercial license",
      "Priority generation",
      "Email support",
      "Unlimited projects",
    ],
    exportFormats: ["PNG", "GLB", "OBJ", "FBX", "STL"],
    watermark: false,
    projectLimit: null,
    seats: 1,
    apiAccess: false,
    apiRequestLimit: null,
    prioritySpeed: "priority",
    support: "email",
    commercialLicense: true,
  },
  pro: {
    tier: "pro",
    label: "Pro",
    monthlyPrice: 60,
    annualPrice: 576,
    generationLimit: 175,
    features: [
      "175 AI generations/month",
      "No watermarks",
      "All export formats",
      "Commercial license",
      "Priority generation (2x)",
      "Email support",
      "Unlimited projects",
      "API access (500 req/mo)",
    ],
    exportFormats: ["GLB", "OBJ", "FBX", "STL"],
    watermark: false,
    projectLimit: null,
    seats: 1,
    apiAccess: true,
    apiRequestLimit: 500,
    prioritySpeed: "2x",
    support: "email",
    commercialLicense: true,
  },
  mega: {
    tier: "mega",
    label: "Mega",
    monthlyPrice: 120,
    annualPrice: 1152,
    generationLimit: 500,
    features: [
      "Unlimited AI generations*",
      "No watermarks",
      "All export formats",
      "Commercial license",
      "Priority generation (5x)",
      "Priority support (24hr)",
      "Unlimited projects",
      "API access (unlimited)",
      "Team collaboration (5 seats)",
    ],
    exportFormats: ["GLB", "PNG", "OBJ", "FBX", "STL"],
    watermark: false,
    projectLimit: null,
    seats: 5,
    apiAccess: true,
    apiRequestLimit: null,
    prioritySpeed: "5x",
    support: "priority",
    commercialLicense: true,
  },
};
