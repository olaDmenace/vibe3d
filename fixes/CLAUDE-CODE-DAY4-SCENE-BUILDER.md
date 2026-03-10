# Vibe3D — DAY 4: AI Scene Builder

The killer feature: user types "a cozy desk setup" → the AI decomposes it into individual objects, generates each one, and auto-places them in the scene. This is what makes people share your product.

Apply ALL sections.

---

## Section 1: Scene decomposition via Claude

When the user's prompt describes a SCENE (multiple objects), the AI should break it into individual generation requests instead of sending the whole phrase to Meshy.

### A. Add scene detection to the chat panel

**File:** `src/components/editor/chat/chat-panel.tsx`

Before checking if a message is a generation request, check if it's a SCENE request:

```ts
function isSceneRequest(message: string): boolean {
  const lower = message.toLowerCase();

  // Scene keywords — these suggest multiple objects
  const scenePatterns = [
    /(?:scene|setup|environment|room|desk|table|kitchen|office|bedroom|living room|workspace|studio)/i,
    /(?:with|including|containing|featuring)\s+(?:a|an|some|the)\s+\w+\s+(?:and|,)\s+/i, // "with a lamp and books"
    /(?:create|build|make|generate)\s+(?:a|an|my)\s+\w+\s+(?:scene|setup|room|space)/i,
  ];

  return scenePatterns.some((p) => p.test(lower));
}
```

### B. Use Claude to decompose the scene

When a scene request is detected, call the chat API to decompose it BEFORE generating:

```ts
async function decomposeScene(prompt: string): Promise<{
  objects: Array<{
    name: string;
    prompt: string;
    position: [number, number, number];
    scale: [number, number, number];
  }>;
  lighting?: string;
}> {
  const res = await fetch(`/api/projects/${projectId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: prompt,
      mode: "scene_decompose", // Tell the API to use a special system prompt
    }),
  });

  const data = await res.json();
  return data.sceneObjects;
}
```

### C. API route for scene decomposition

**File:** `src/app/api/projects/[id]/chat/route.ts`

Add a handler for `mode: "scene_decompose"`. This uses Claude to break down the prompt:

```ts
if (mode === "scene_decompose") {
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
    messages: [
      { role: "user", content: message },
    ],
  });

  const text = response.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const parsed = JSON.parse(text.replace(/```json\n?|```/g, "").trim());
    return NextResponse.json({ sceneObjects: parsed });
  } catch {
    return NextResponse.json({
      sceneObjects: {
        objects: [{ name: "Scene", prompt: message, position: [0, 0, 0], scale: [1, 1, 1] }],
      },
    });
  }
}
```

### D. Sequential generation with progress

Back in the chat panel, when a scene is decomposed, generate each object sequentially:

```ts
async function handleSceneGeneration(prompt: string) {
  setMessages((prev) => [
    ...prev,
    { role: "user", content: prompt, timestamp: new Date().toISOString() },
    {
      role: "assistant",
      content: `Planning your scene: "${prompt}"...`,
      timestamp: new Date().toISOString(),
    },
  ]);

  // Step 1: Decompose
  const decomposition = await decomposeScene(prompt);
  const objects = decomposition.objects;

  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      content: `Scene planned with ${objects.length} objects: ${objects.map((o) => o.name).join(", ")}. Generating each...`,
      timestamp: new Date().toISOString(),
    },
  ]);

  // Step 2: Generate each object sequentially
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Generating ${obj.name} (${i + 1}/${objects.length})...`,
        timestamp: new Date().toISOString(),
      },
    ]);

    useGenerationStore.getState().setGenerating(obj.name);
    useGenerationStore.getState().setProgress(0);

    try {
      // Call the generate API
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: obj.prompt, style: selectedStyle }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Failed to generate ${obj.name}: ${data.error || "Unknown error"}. Continuing...`,
            timestamp: new Date().toISOString(),
          },
        ]);
        continue;
      }

      if (data.cached) {
        // Add cached object to scene
        const objId = crypto.randomUUID();
        dispatch({
          type: "ADD_OBJECT",
          id: objId,
          payload: {
            name: obj.name,
            parentId: null,
            assetId: data.asset.id,
            visible: true,
            locked: false,
            transform: {
              position: obj.position,
              rotation: [0, 0, 0],
              scale: obj.scale,
            },
            materialOverrides: [],
            metadata: { cached: true },
          },
        });
        continue;
      }

      // Poll for completion (reuse existing pollGeneration but with custom position)
      await pollGenerationForScene(data.taskId, obj.prompt, obj.name, obj.position, obj.scale);

    } catch (err) {
      console.error(`Failed to generate ${obj.name}:`, err);
    }
  }

  useGenerationStore.getState().clearGeneration();

  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      content: `Scene complete! Generated ${objects.length} objects. You can select and edit each one individually.`,
      timestamp: new Date().toISOString(),
    },
  ]);
}
```

### E. Modified poll function for scene objects

Create a variant of pollGeneration that accepts custom position/scale/name:

```ts
function pollGenerationForScene(
  taskId: string,
  prompt: string,
  name: string,
  position: [number, number, number],
  scale: [number, number, number]
): Promise<void> {
  return new Promise((resolve) => {
    let delay = 3000;
    let attempts = 0;
    const maxAttempts = 60;
    let isRefining = false;
    let currentTaskId = taskId;

    async function poll() {
      if (attempts >= maxAttempts) {
        resolve();
        return;
      }
      attempts++;

      try {
        const refineParam = isRefining ? "&refine=true" : "";
        const res = await fetch(
          `/api/projects/${projectId}/generate/${currentTaskId}?prompt=${encodeURIComponent(prompt)}${refineParam}`
        );
        const data = await res.json();

        if (data.status === "refining" && data.refineTaskId) {
          currentTaskId = data.refineTaskId;
          isRefining = true;
          delay = 3000;
          const displayProgress = 50;
          useGenerationStore.getState().setProgress(displayProgress);
          setTimeout(poll, delay);
          return;
        }

        if (data.status === "complete" && data.modelUrl) {
          // Add to scene with the planned position
          const objId = crypto.randomUUID();
          dispatch({
            type: "ADD_OBJECT",
            id: objId,
            payload: {
              name,
              parentId: null,
              assetId: `generated:${currentTaskId}`,
              visible: true,
              locked: false,
              transform: { position, rotation: [0, 0, 0], scale },
              materialOverrides: [],
              metadata: {
                modelUrl: data.modelUrl,
                thumbnailUrl: data.thumbnailUrl,
                meshNames: data.meshNames,
                meshCount: data.meshCount,
                generationTaskId: currentTaskId,
              },
            },
          });
          resolve();
          return;
        }

        if (data.status === "failed") {
          resolve();
          return;
        }

        // Continue polling
        const displayProgress = isRefining
          ? 50 + Math.floor((data.progress ?? 0) / 2)
          : Math.floor((data.progress ?? 0) / 2);
        useGenerationStore.getState().setProgress(displayProgress);

        delay = Math.min(delay * 1.3, 15000);
        setTimeout(poll, delay);
      } catch {
        delay = Math.min(delay * 1.5, 15000);
        setTimeout(poll, delay);
      }
    }

    setTimeout(poll, delay);
  });
}
```

### F. Wire it into the main message handler

In the main `handleSend` function, add scene detection before generation detection:

```ts
async function handleSend(message: string) {
  if (isSceneRequest(message) && isGenerationRequest(message)) {
    // Scene generation — decompose and generate multiple objects
    await handleSceneGeneration(message);
    return;
  }

  if (isGenerationRequest(message)) {
    // Single object generation (existing flow)
    // ...
  }

  // Regular chat (editing, questions, etc.)
  // ...
}
```

**Verify:**
```bash
npx tsc --noEmit
npm run build
```

---

## Section 2: Scene templates

Add preset scene templates that users can generate with one click.

### A. Template data

```ts
const SCENE_TEMPLATES = [
  {
    id: "desk-setup",
    label: "Desk Setup",
    icon: "🖥️",
    prompt: "Create a modern desk setup with a desk, monitor, keyboard, desk lamp, and coffee mug",
  },
  {
    id: "living-room",
    label: "Living Room",
    icon: "🛋️",
    prompt: "Create a cozy living room with a sofa, coffee table, floor lamp, and bookshelf",
  },
  {
    id: "product-studio",
    label: "Product Studio",
    icon: "📸",
    prompt: "Create a product photography studio with a white display table and two studio lights",
  },
  {
    id: "game-scene",
    label: "Game Scene",
    icon: "🎮",
    prompt: "Create a game scene with a treasure chest, wooden barrel, torch on a wall mount, and stone pedestal",
  },
  {
    id: "outdoor-cafe",
    label: "Outdoor Café",
    icon: "☕",
    prompt: "Create an outdoor café scene with a small round table, two chairs, a potted plant, and a coffee cup",
  },
];
```

### B. Template selector UI

Add a "Scenes" tab or section in the chat empty state (when no messages):

```tsx
{messages.length === 0 && (
  <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
    {/* Single object suggestions */}
    <div>
      <p className="text-xs text-[var(--text-dim)] mb-2 text-center">Create an object:</p>
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="..." onClick={() => setInput(s)}>
            {s.replace("Create ", "")}
          </button>
        ))}
      </div>
    </div>

    {/* Scene templates */}
    <div>
      <p className="text-xs text-[var(--text-dim)] mb-2 text-center">Or generate a full scene:</p>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {SCENE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-bg)] transition-colors"
            onClick={() => handleSceneGeneration(t.prompt)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

**Verify:**
```bash
npx tsc --noEmit
npm run build
```

---

## Section 3: Scene generation overlay

During scene generation (multiple objects), show a special overlay that tracks per-object progress:

**File:** `src/store/generation-store.ts`

Add scene generation tracking:

```ts
// Add to the store:
sceneObjects: Array<{
  name: string;
  status: "pending" | "generating" | "complete" | "failed";
}>;
setSceneObjects: (objects: Array<{ name: string; status: string }>) => void;
updateSceneObjectStatus: (index: number, status: string) => void;
```

**File:** `src/components/editor/viewport/generation-overlay.tsx`

When scene generation is active, show a multi-step progress:

```tsx
function SceneGenerationOverlay() {
  const sceneObjects = useGenerationStore((s) => s.sceneObjects);
  const currentPrompt = useGenerationStore((s) => s.currentPrompt);

  if (!sceneObjects || sceneObjects.length === 0) return null;

  const completed = sceneObjects.filter((o) => o.status === "complete").length;
  const total = sceneObjects.length;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
      <div className="text-center max-w-sm bg-[var(--panel-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-xl">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-4">
          Building Scene ({completed}/{total})
        </p>

        <div className="space-y-2 text-left">
          {sceneObjects.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                obj.status === "complete" ? "bg-emerald-500" :
                obj.status === "generating" ? "bg-indigo-400 animate-pulse" :
                obj.status === "failed" ? "bg-red-400" :
                "bg-[var(--input-bg)]"
              }`} />
              <span className={`text-xs truncate ${
                obj.status === "generating" ? "text-[var(--text-primary)]" :
                obj.status === "complete" ? "text-[var(--text-muted)]" :
                "text-[var(--text-dim)]"
              }`}>
                {obj.name}
              </span>
              {obj.status === "complete" && (
                <span className="text-[10px] text-emerald-500 ml-auto">✓</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 w-full h-1 bg-[var(--input-bg)] rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

**Verify:**
```bash
npx tsc --noEmit
npm run build
```

---

## Final Verification

```bash
npx tsc --noEmit && echo "TS PASS" || echo "TS FAIL"
npm run lint && echo "LINT PASS" || echo "LINT FAIL"
npm run build && echo "BUILD PASS" || echo "BUILD FAIL"
```

## Update PROGRESS.md

```markdown
### Day 4 — AI Scene Builder — YYYY-MM-DD
- [x] Scene request detection (desk setup, living room, etc.)
- [x] Claude-powered scene decomposition (prompt → object list with positions)
- [x] Sequential multi-object generation with per-object progress
- [x] Scene generation overlay showing per-object status
- [x] 5 preset scene templates (Desk Setup, Living Room, Product Studio, Game Scene, Outdoor Café)
- [x] Template selector in empty chat state
```
