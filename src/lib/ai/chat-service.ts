import Anthropic from "@anthropic-ai/sdk";
import type { EditorAction } from "@/types/actions";
import type { SceneState } from "@/types/scene";

/* ------------------------------------------------------------------ */
/*  Chat Service                                                       */
/*  Uses Claude to interpret natural-language commands into             */
/*  EditorAction[] that the store can dispatch.                        */
/* ------------------------------------------------------------------ */

/** A single message in the conversation */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** If the assistant returned actions, they are stored here */
  actions?: EditorAction[];
  timestamp: string;
}

/** Result from a chat request */
export interface ChatResult {
  reply: string;
  actions: EditorAction[];
}

function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  return new Anthropic({ apiKey: key });
}

/** Build a system prompt that includes the scene context */
function buildSystemPrompt(scene: SceneState): string {
  const objectList = Object.values(scene.objects)
    .map(
      (o) =>
        `  - id: "${o.id}", name: "${o.name}", position: [${o.transform.position}], rotation: [${o.transform.rotation}], scale: [${o.transform.scale}], visible: ${o.visible}, locked: ${o.locked}`
    )
    .join("\n");

  return `You are an AI assistant embedded in a 3D editor called Vibe3D.
You help users manipulate their 3D scene by returning structured EditorAction commands.

## Current Scene
Objects in scene:
${objectList || "  (empty scene)"}

Lighting:
  - Ambient: color=${scene.lighting.ambientLight.color}, intensity=${scene.lighting.ambientLight.intensity}
  - Directional lights: ${scene.lighting.directionalLights.length}
  - Point lights: ${scene.lighting.pointLights.length}

Environment:
  - Background: ${scene.environment.backgroundColor}
  - Grid: ${scene.environment.showGrid ? "visible" : "hidden"}, size=${scene.environment.gridSize}

## Your capabilities
You can return actions in the following JSON format. Return a JSON array of actions wrapped in a <actions> tag.

Available action types:
1. ADD_OBJECT: { type: "ADD_OBJECT", id: "<uuid>", payload: { name, parentId: null, assetId: "primitive:<type>", visible: true, locked: false, transform: { position: [x,y,z], rotation: [x,y,z], scale: [x,y,z] }, materialOverrides: [], metadata: {} } }
   - For primitives, use assetId: "primitive:box", "primitive:sphere", "primitive:cylinder", "primitive:cone", "primitive:plane", "primitive:torus"
2. DELETE_OBJECT: { type: "DELETE_OBJECT", id: "<existing-object-id>" }
3. DUPLICATE_OBJECT: { type: "DUPLICATE_OBJECT", sourceId: "<existing-id>", newId: "<uuid>" }
4. TRANSFORM_OBJECT: { type: "TRANSFORM_OBJECT", id: "<existing-id>", transform: { position?: [x,y,z], rotation?: [x,y,z], scale?: [x,y,z] } }
5. UPDATE_MATERIAL: { type: "UPDATE_MATERIAL", id: "<existing-id>", overrides: [{ materialIndex: 0, color?: "#hex", roughness?: 0-1, metalness?: 0-1, opacity?: 0-1 }] }
6. RENAME_OBJECT: { type: "RENAME_OBJECT", id: "<existing-id>", name: "<new-name>" }
7. SET_VISIBILITY: { type: "SET_VISIBILITY", id: "<existing-id>", visible: true|false }
8. SET_LOCKED: { type: "SET_LOCKED", id: "<existing-id>", locked: true|false }
9. UPDATE_LIGHTING: { type: "UPDATE_LIGHTING", lighting: { ambientLight?: { color, intensity }, directionalLights?: [...], pointLights?: [...] } }
10. UPDATE_ENVIRONMENT: { type: "UPDATE_ENVIRONMENT", environment: { backgroundColor?: "#hex", showGrid?: boolean, gridSize?: number } }
11. BATCH_ACTIONS: { type: "BATCH_ACTIONS", actions: [...] } — wrap multiple actions for atomic execution

## Response format
Always respond with:
1. A brief natural-language explanation of what you're doing
2. If changes are needed, include the actions in an <actions>[...]</actions> tag

If the user's request is a question or doesn't require scene changes, just answer normally without an <actions> tag.

## Rules
- Only reference object IDs that exist in the current scene, unless creating new objects
- Generate valid UUIDs for new object IDs (use format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
- Keep position values reasonable (-100 to 100)
- Rotation values are in radians
- Scale values should be positive (0.01 to 100)
- Material values: roughness/metalness/opacity are 0-1, colors are hex strings
- When asked to generate/create a 3D model with AI, respond that you cannot generate models directly but the user can use the generation feature with a text prompt
- Be concise in your explanations`;
}

/** Parse actions from the assistant's reply */
function parseActionsFromReply(reply: string): EditorAction[] {
  const match = reply.match(/<actions>([\s\S]*?)<\/actions>/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return [];
    return parsed as EditorAction[];
  } catch {
    return [];
  }
}

/** Validate that actions reference valid object IDs and have valid values */
export function validateActions(
  actions: EditorAction[],
  scene: SceneState
): { valid: EditorAction[]; errors: string[] } {
  const valid: EditorAction[] = [];
  const errors: string[] = [];
  const objectIds = new Set(Object.keys(scene.objects));

  for (const action of actions) {
    switch (action.type) {
      case "ADD_OBJECT":
        // New objects are always valid if they have required fields
        if (action.id && action.payload?.name && action.payload?.transform) {
          valid.push(action);
        } else {
          errors.push(`ADD_OBJECT missing required fields`);
        }
        break;

      case "DELETE_OBJECT":
      case "SET_VISIBILITY":
      case "SET_LOCKED":
      case "RENAME_OBJECT":
      case "UPDATE_MATERIAL":
        if ("id" in action && objectIds.has(action.id)) {
          valid.push(action);
        } else {
          errors.push(`${action.type}: object "${("id" in action && action.id) || "unknown"}" not found`);
        }
        break;

      case "TRANSFORM_OBJECT":
        if (objectIds.has(action.id)) {
          // Validate numeric values are finite
          const t = action.transform;
          const nums = [
            ...(t.position ?? []),
            ...(t.rotation ?? []),
            ...(t.scale ?? []),
          ];
          if (nums.every((n) => typeof n === "number" && isFinite(n))) {
            valid.push(action);
          } else {
            errors.push(`TRANSFORM_OBJECT: invalid numeric values`);
          }
        } else {
          errors.push(`TRANSFORM_OBJECT: object "${action.id}" not found`);
        }
        break;

      case "DUPLICATE_OBJECT":
        if (objectIds.has(action.sourceId)) {
          valid.push(action);
        } else {
          errors.push(`DUPLICATE_OBJECT: source "${action.sourceId}" not found`);
        }
        break;

      case "UPDATE_LIGHTING":
      case "UPDATE_ENVIRONMENT":
        valid.push(action);
        break;

      case "BATCH_ACTIONS": {
        const sub = validateActions(action.actions, scene);
        if (sub.valid.length > 0) {
          valid.push({ type: "BATCH_ACTIONS", actions: sub.valid });
        }
        errors.push(...sub.errors);
        break;
      }

      default:
        errors.push(`Unknown action type: ${(action as { type: string }).type}`);
    }
  }

  return { valid, errors };
}

/** Send a chat message and get back a reply + validated actions */
export async function chat(
  userMessage: string,
  scene: SceneState,
  history: ChatMessage[] = []
): Promise<ChatResult> {
  const client = getAnthropicClient();

  // Convert history to Anthropic message format
  const messages: Anthropic.MessageParam[] = history
    .slice(-20) // Keep last 20 messages for context
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Add the current user message
  messages.push({ role: "user", content: userMessage });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: buildSystemPrompt(scene),
    messages,
  });

  // Extract text content
  const reply = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Parse and validate actions
  const rawActions = parseActionsFromReply(reply);
  const { valid, errors } = validateActions(rawActions, scene);

  if (errors.length > 0) {
    console.warn("[chat-service] Action validation errors:", errors);
  }

  // Clean the reply by removing the <actions> tag for display
  const cleanReply = reply.replace(/<actions>[\s\S]*?<\/actions>/, "").trim();

  return {
    reply: cleanReply,
    actions: valid,
  };
}
