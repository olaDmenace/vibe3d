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

let _anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (_anthropicClient) return _anthropicClient;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  _anthropicClient = new Anthropic({ apiKey: key });
  return _anthropicClient;
}

/* ------------------------------------------------------------------ */
/*  Tool definition for structured action output                       */
/* ------------------------------------------------------------------ */

const EDITOR_ACTIONS_TOOL: Anthropic.Tool = {
  name: "execute_editor_actions",
  description:
    "Execute one or more editor actions on the 3D scene. Call this whenever the user's request requires changing the scene.",
  input_schema: {
    type: "object" as const,
    properties: {
      actions: {
        type: "array",
        description: "Array of EditorAction objects to dispatch",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "ADD_OBJECT",
                "DELETE_OBJECT",
                "DUPLICATE_OBJECT",
                "TRANSFORM_OBJECT",
                "UPDATE_MATERIAL",
                "RENAME_OBJECT",
                "SET_VISIBILITY",
                "SET_LOCKED",
                "UPDATE_LIGHTING",
                "UPDATE_ENVIRONMENT",
                "BATCH_ACTIONS",
              ],
            },
          },
          required: ["type"],
        },
      },
      explanation: {
        type: "string",
        description: "Brief natural-language explanation of what was done",
      },
    },
    required: ["actions", "explanation"],
  },
};

/* ------------------------------------------------------------------ */
/*  System prompt                                                      */
/* ------------------------------------------------------------------ */

/** Build a system prompt that includes the scene context */
function buildSystemPrompt(scene: SceneState): string {
  const objectList = Object.values(scene.objects)
    .map((o) => {
      const meshNames = (o.metadata?.meshNames as string[] | undefined) ?? [];
      const meshCount = meshNames.length;
      const meshInfo =
        meshCount >= 2
          ? `meshCount: ${meshCount}, meshNames: [${meshNames.map((n) => `"${n}"`).join(", ")}]`
          : `meshCount: ${meshCount} (single-mesh model)`;

      // Show current material overrides
      const overridesInfo =
        o.materialOverrides.length > 0
          ? `, materialOverrides: [${o.materialOverrides
              .map((ov) => {
                const parts: string[] = [`materialIndex: ${ov.materialIndex}`];
                if (ov.meshName) parts.push(`meshName: "${ov.meshName}"`);
                if (ov.color) parts.push(`color: "${ov.color}"`);
                if (ov.roughness !== undefined) parts.push(`roughness: ${ov.roughness}`);
                if (ov.metalness !== undefined) parts.push(`metalness: ${ov.metalness}`);
                if (ov.opacity !== undefined) parts.push(`opacity: ${ov.opacity}`);
                return `{ ${parts.join(", ")} }`;
              })
              .join(", ")}]`
          : "";

      return `  - id: "${o.id}", name: "${o.name}", position: [${o.transform.position}], rotation: [${o.transform.rotation}], scale: [${o.transform.scale}], visible: ${o.visible}, locked: ${o.locked}, ${meshInfo}${overridesInfo}`;
    })
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
When the user's request requires scene changes, use the execute_editor_actions tool. For questions or conversation that don't require changes, respond normally without using the tool.

Available action types:
1. ADD_OBJECT: { type: "ADD_OBJECT", id: "<uuid>", payload: { name, parentId: null, assetId: "primitive:<type>", visible: true, locked: false, transform: { position: [x,y,z], rotation: [x,y,z], scale: [x,y,z] }, materialOverrides: [], metadata: {} } }
   - For primitives, use assetId: "primitive:box", "primitive:sphere", "primitive:cylinder", "primitive:cone", "primitive:plane", "primitive:torus"
2. DELETE_OBJECT: { type: "DELETE_OBJECT", id: "<existing-object-id>" }
3. DUPLICATE_OBJECT: { type: "DUPLICATE_OBJECT", sourceId: "<existing-id>", newId: "<uuid>" }
4. TRANSFORM_OBJECT: { type: "TRANSFORM_OBJECT", id: "<existing-id>", transform: { position?: [x,y,z], rotation?: [x,y,z], scale?: [x,y,z] } }
5. UPDATE_MATERIAL: { type: "UPDATE_MATERIAL", id: "<existing-id>", overrides: [{ materialIndex: 0, meshName?: "<mesh-name>", color?: "#hex", roughness?: 0-1, metalness?: 0-1, opacity?: 0-1 }] }
6. RENAME_OBJECT: { type: "RENAME_OBJECT", id: "<existing-id>", name: "<new-name>" }
7. SET_VISIBILITY: { type: "SET_VISIBILITY", id: "<existing-id>", visible: true|false }
8. SET_LOCKED: { type: "SET_LOCKED", id: "<existing-id>", locked: true|false }
9. UPDATE_LIGHTING: { type: "UPDATE_LIGHTING", lighting: { ambientLight?: { color, intensity }, directionalLights?: [...], pointLights?: [...] } }
10. UPDATE_ENVIRONMENT: { type: "UPDATE_ENVIRONMENT", environment: { backgroundColor?: "#hex", showGrid?: boolean, gridSize?: number } }
11. BATCH_ACTIONS: { type: "BATCH_ACTIONS", actions: [...] } — wrap multiple actions for atomic execution

## CRITICAL: Material override rules based on meshCount

**If meshCount = 0 or meshCount = 1 (single-mesh model):**
- The model was generated as ONE solid mesh with NO separable parts
- MUST NOT use meshName in overrides — only materialIndex: 0
- Any color/material change applies to the ENTIRE model
- If the user asks to change a specific part (e.g. "make the tires black"), explain that this AI-generated model is a single mesh and individual parts cannot be recolored separately. Suggest regenerating the model or adding separate primitive objects.

**If meshCount >= 2 (multi-mesh model):**
- The model has separable parts that can be individually targeted
- Use meshName to target specific parts (e.g. tires, body, windows)
- Each override with a meshName only affects that specific mesh
- You can include multiple overrides in the array to target different parts simultaneously
- Mesh names often contain descriptive keywords like "tire", "wheel", "body", "glass", "seat" etc. Match user intent to the closest mesh name.
- An override WITHOUT meshName (just materialIndex: 0) acts as a global fallback for meshes not specifically targeted

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

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

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
          // For UPDATE_MATERIAL, strip meshName for single-mesh models
          if (action.type === "UPDATE_MATERIAL") {
            const obj = scene.objects[action.id];
            const meshNames = (obj?.metadata?.meshNames as string[] | undefined) ?? [];
            if (meshNames.length <= 1) {
              const cleaned = {
                ...action,
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                overrides: action.overrides.map(({ meshName, ...rest }) => ({
                  ...rest,
                  materialIndex: 0,
                })),
              };
              valid.push(cleaned);
            } else {
              valid.push(action);
            }
          } else {
            valid.push(action);
          }
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

/* ------------------------------------------------------------------ */
/*  Main chat function                                                 */
/* ------------------------------------------------------------------ */

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
    tools: [EDITOR_ACTIONS_TOOL],
  });

  // Extract text blocks as conversational reply
  const textReply = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Extract actions from tool_use blocks
  let rawActions: EditorAction[] = [];
  let toolExplanation = "";

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (toolUseBlock && toolUseBlock.name === "execute_editor_actions") {
    const input = toolUseBlock.input as { actions: EditorAction[]; explanation: string };
    rawActions = input.actions;
    toolExplanation = input.explanation;
  }

  // Validate actions
  const { valid, errors } = validateActions(rawActions, scene);

  if (errors.length > 0) {
    console.warn("[chat-service] Action validation errors:", errors);
  }

  // Build the reply: prefer text reply, fall back to tool explanation
  const reply = textReply || toolExplanation || "Done.";

  return {
    reply,
    actions: valid,
  };
}
