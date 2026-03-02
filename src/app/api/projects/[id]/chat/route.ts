import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chat, type ChatMessage } from "@/lib/ai/chat-service";
import type { SceneState } from "@/types/scene";
import { validateBody, chatMessageSchema, apiError } from "@/lib/api/validation";

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
  const { message, sceneState: clientSceneState } = validated.data;

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
