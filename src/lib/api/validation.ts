import { z } from "zod";
import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Shared Zod schemas for API route validation                        */
/* ------------------------------------------------------------------ */

/** Standard error response format */
export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

/** Create a standardized error response */
export function apiError(
  message: string,
  status: number,
  code?: string,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, code, details },
    { status }
  );
}

/** Validate request body with a Zod schema */
export async function validateBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T> } | { error: NextResponse<ApiError> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        error: apiError(
          "Validation failed",
          400,
          "VALIDATION_ERROR",
          result.error.flatten()
        ),
      };
    }
    return { data: result.data };
  } catch {
    return { error: apiError("Invalid JSON body", 400, "INVALID_JSON") };
  }
}

/* ------------------------------------------------------------------ */
/*  Project schemas                                                    */
/* ------------------------------------------------------------------ */

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200).optional().default("Untitled Project"),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  is_public: z.boolean().optional(),
  thumbnail_url: z.string().url().optional(),
});

/* ------------------------------------------------------------------ */
/*  User schemas                                                       */
/* ------------------------------------------------------------------ */

export const updateUserSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  preferences: z
    .object({
      theme: z.enum(["dark", "light", "auto"]).optional(),
      language: z.string().max(10).optional(),
      push_notifications: z.boolean().optional(),
      email_updates: z.boolean().optional(),
    })
    .optional(),
  avatar_url: z.string().max(2000).optional(),
});

/* ------------------------------------------------------------------ */
/*  Chat schemas                                                       */
/* ------------------------------------------------------------------ */

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  sceneState: z.record(z.string(), z.unknown()).optional(),
});

/* ------------------------------------------------------------------ */
/*  Generation schemas                                                 */
/* ------------------------------------------------------------------ */

export const generateSchema = z.object({
  prompt: z.string().min(1).max(1000),
  style: z.string().max(50).optional(),
  imageUrl: z.string().url().optional(),
});

/* ------------------------------------------------------------------ */
/*  Scene schemas                                                      */
/* ------------------------------------------------------------------ */

export const updateSceneSchema = z.object({
  scene_graph: z.record(z.string(), z.unknown()),
});

/* ------------------------------------------------------------------ */
/*  Pagination schemas                                                 */
/* ------------------------------------------------------------------ */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/* ------------------------------------------------------------------ */
/*  Share schemas                                                      */
/* ------------------------------------------------------------------ */

export const createShareSchema = z.object({
  email: z.string().email(),
  permission: z.enum(["view", "edit", "admin"]).default("view"),
});

export const updateShareSchema = z.object({
  permission: z.enum(["view", "edit", "admin"]),
});
