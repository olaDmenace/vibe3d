import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { chat, type ChatMessage } from "@/lib/ai/chat-service";
import type { SceneState } from "@/types/scene";
import { validateBody, chatMessageSchema, apiError } from "@/lib/api/validation";

let _anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (_anthropicClient) return _anthropicClient;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  _anthropicClient = new Anthropic({ apiKey: key });
  return _anthropicClient;
}

/* ------------------------------------------------------------------ */
/*  Simple in-memory rate limiter (per-user, 30 messages/minute)       */
/* ------------------------------------------------------------------ */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let rateLimitCheckCounter = 0;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();

  // Periodically clean stale entries (every 100th request)
  rateLimitCheckCounter++;
  if (rateLimitCheckCounter % 100 === 0) {
    for (const [key, entry] of rateLimitMap) {
      if (entry.resetAt < now) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  entry.count++;
  if (entry.count > 30) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/*  POST /api/projects/[id]/chat — send a message to the AI           */
/* ------------------------------------------------------------------ */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  // Rate limit check
  if (!checkRateLimit(user.id)) {
    return apiError(
      "You're sending messages too quickly. Please wait a moment.",
      429,
      "RATE_LIMITED"
    );
  }

  // Verify project ownership (filter soft-deleted projects)
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (!project || project.owner_id !== user.id) {
    return apiError("Project not found", 404, "NOT_FOUND");
  }

  const validated = await validateBody(request, chatMessageSchema);
  if ("error" in validated) return validated.error;
  const { message, sceneState: clientSceneState, mode } = validated.data;

  // ---- Scene decomposition mode ----
  if (mode === "scene_decompose") {
    try {
      const anthropic = getAnthropicClient();
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are a 3D scene planner. Given a user's scene description, decompose it into individual 3D objects that should be generated separately.

Return a JSON object with this exact structure:
{
  "objects": [
    {
      "name": "Display Name",
      "prompt": "Detailed generation prompt for this single object",
      "position": [x, y, z],
      "scale": [sx, sy, sz]
    }
  ]
}

Rules:
- Each object should be a single, distinct item (not a scene)
- Positions should be spatially reasonable (Y=0 is ground, objects don't overlap)
- Scale should be relative (1,1,1 is default, adjust for relative size)
- Maximum 6 objects per scene (to stay within generation limits)
- The generation prompt should describe ONE object in detail for a text-to-3D model generator
- Include structural/material details in each prompt
- Place objects logically (lamp on or near desk, chair in front of desk, etc.)
- Use a coordinate system where: X = left/right, Y = up, Z = forward/back

Return ONLY the JSON object, no markdown or explanation.`,
        messages: [{ role: "user", content: message }],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      const parsed = JSON.parse(text.replace(/```json\n?|```/g, "").trim());
      return NextResponse.json({ sceneObjects: parsed });
    } catch (err) {
      console.error("[chat-route] Scene decomposition failed:", err);
      return NextResponse.json({
        sceneObjects: {
          objects: [{ name: "Scene", prompt: message, position: [0, 0, 0], scale: [1, 1, 1] }],
        },
      });
    }
  }

  // Use client-provided scene state if available, otherwise fetch from DB
  let sceneState: SceneState;
  if (clientSceneState) {
    sceneState = clientSceneState as unknown as SceneState;
  } else {
    const { data: scene } = await supabase
      .from("scenes")
      .select("scene_graph")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    sceneState = (scene?.scene_graph ?? {}) as unknown as SceneState;
  }

  // Load existing conversation history
  const { data: convo } = await supabase
    .from("ai_conversations")
    .select("id, messages")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  const history: ChatMessage[] = (convo?.messages as ChatMessage[] | null) ?? [];

  // Call the AI (with error handling for Anthropic API failures)
  let chatResult;
  try {
    chatResult = await chat(message, sceneState, history);
  } catch (err) {
    console.error("[chat-route] AI call failed:", err);

    const errorMessage = err instanceof Error ? err.message : String(err);

    if (errorMessage.includes("rate_limit") || errorMessage.includes("429")) {
      return apiError(
        "The AI service is currently rate-limited. Please try again in a moment.",
        503,
        "AI_RATE_LIMITED"
      );
    }
    if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      return apiError(
        "The AI service timed out. Please try again.",
        503,
        "AI_TIMEOUT"
      );
    }
    return apiError(
      "The AI service is temporarily unavailable. Please try again.",
      503,
      "AI_UNAVAILABLE"
    );
  }

  // Build updated messages array
  const now = new Date().toISOString();
  const updatedMessages: ChatMessage[] = [
    ...history,
    { role: "user", content: message, timestamp: now },
    {
      role: "assistant",
      content: chatResult.reply,
      actions: chatResult.actions.length > 0 ? chatResult.actions : undefined,
      timestamp: now,
    },
  ];

  // Keep conversation to last 100 messages to prevent unbounded growth
  const trimmedMessages = updatedMessages.slice(-100);

  // Upsert conversation
  if (convo) {
    await supabase
      .from("ai_conversations")
      .update({
        messages: trimmedMessages as unknown as Record<string, unknown>[],
        updated_at: now,
      })
      .eq("id", convo.id);
  } else {
    await supabase.from("ai_conversations").insert({
      user_id: user.id,
      project_id: projectId,
      messages: trimmedMessages as unknown as Record<string, unknown>[],
    });
  }

  return NextResponse.json({
    reply: chatResult.reply,
    actions: chatResult.actions,
  });
}

/* ------------------------------------------------------------------ */
/*  GET /api/projects/[id]/chat — load conversation history            */
/* ------------------------------------------------------------------ */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { data: convo } = await supabase
    .from("ai_conversations")
    .select("messages")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    messages: (convo?.messages as ChatMessage[] | null) ?? [],
  });
}
