# Product Requirements Document: 3D AI Editor

## Executive Summary

A web-based 3D editor platform where users create, edit, save, download, and upload 3D models using AI-driven natural language commands alongside traditional manipulation tools. Think "Figma × Blender Lite × ChatGPT" — a deterministic 3D editor with AI as one input modality.

---

## Table of Contents

1. [Product Vision](#product-vision)
2. [Core User Flows](#core-user-flows)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Data Models & Schema](#data-models--schema)
6. [Editor Core — State Engine](#editor-core--state-engine)
7. [AI Integration Layer](#ai-integration-layer)
8. [3D Rendering Layer](#3d-rendering-layer)
9. [Asset Pipeline](#asset-pipeline)
10. [Authentication & Authorization](#authentication--authorization)
11. [API Design](#api-design)
12. [File Storage Architecture](#file-storage-architecture)
13. [MCP Servers & Claude Code Tooling](#mcp-servers--claude-code-tooling)
14. [Progress Tracking](#progress-tracking)
15. [Evolving Design](#evolving-design)
16. [Implementation Phases](#implementation-phases)
17. [Non-Functional Requirements](#non-functional-requirements)

---

## Product Vision

### What This Is
A stateful 3D editor platform with AI as one input method. The product is the **editor core** — AI, rendering, and storage all plug into it.

### What This Is NOT
- A Blender clone (no mesh-level geometry editing in v1)
- A pure AI demo (the editor must work fully without AI)
- A real-time multiplayer tool (v1 is single-user)

### Core Capabilities (v1)
- Generate 3D models from text prompts via AI
- Edit object properties (material, transform) via AI natural language
- Manual manipulation: select, move, rotate, scale objects
- Upload custom 3D files (.glb, .gltf, .obj, .fbx, .stl)
- Save projects with full scene state
- Download/export scenes and individual assets
- Undo/redo for all operations

---

## Core User Flows

### Flow 1: AI Generation
```
User types prompt → Frontend sends to API route → API route calls AI service (Meshy/Tripo3D)
→ AI returns .glb → Cleanup pipeline normalizes model → Asset stored in Supabase Storage
→ ADD_OBJECT action dispatched → Scene updates → Renderer displays new object
```

### Flow 2: AI Editing
```
User selects object → Types "make it metallic and scale 2x" → API route sends prompt + scene context to LLM
→ LLM returns structured EditorAction[] → Frontend validates actions → Actions dispatched to store
→ Scene updates → Renderer reflects changes
```

### Flow 3: Manual Editing
```
User clicks object in viewport → Object selected (SELECT_OBJECT action)
→ TransformControls appear → User drags to move/rotate/scale
→ TRANSFORM_OBJECT action dispatched on mouse release → Store updates → Undo stack records change
```

### Flow 4: Upload Custom File
```
User drops .glb/.obj/.fbx file → Client detects format → Loader parses file
→ Normalization pipeline runs (scale, center pivot, fix normals)
→ Asset uploaded to Supabase Storage → ADD_OBJECT action dispatched
→ Object appears in scene at origin
```

### Flow 5: Save & Load Project
```
Save: Scene state serialized from store → JSON + asset references saved to Supabase
Load: Project fetched → Assets downloaded/cached → Scene state hydrated into store → Renderer rebuilds
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ AI Chat  │  │ Viewport │  │ Properties Panel  │  │
│  │  Panel   │  │ (R3F)    │  │ + Scene Hierarchy │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │             │
│       └──────────────┼─────────────────┘             │
│                      │                               │
│              ┌───────▼────────┐                      │
│              │  Editor Store  │ ← Single source of   │
│              │   (Zustand)    │   truth for all state │
│              │                │                      │
│              │  • Scene Graph │                      │
│              │  • Selection   │                      │
│              │  • Undo Stack  │                      │
│              │  • UI State    │                      │
│              └───────┬────────┘                      │
│                      │                               │
└──────────────────────┼───────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Next.js API    │
              │  Routes         │
              │                 │
              │  /api/ai/gen    │
              │  /api/ai/edit   │
              │  /api/projects  │
              │  /api/assets    │
              └────────┬────────┘
                       │
         ┌─────────────┼──────────────┐
         │             │              │
   ┌─────▼─────┐ ┌────▼────┐  ┌─────▼──────┐
   │ Supabase  │ │Supabase │  │  AI APIs   │
   │ Postgres  │ │ Storage │  │            │
   │           │ │         │  │ • Meshy    │
   │ • Users   │ │ • .glb  │  │ • Tripo3D  │
   │ • Projects│ │ • .obj  │  │ • Claude   │
   │ • Scenes  │ │ • textures│ │ • OpenAI   │
   │ • Assets  │ │ • thumbs │  └────────────┘
   └───────────┘ └─────────┘
```

### Architectural Principles
1. **Store is the single source of truth** — no component mutates Three.js directly
2. **Three.js is a dumb view layer** — it reads from the store and renders
3. **AI speaks editor language** — AI returns structured `EditorAction[]`, never raw code or geometry
4. **Every mutation is an action** — enables undo/redo, serialization, and eventually collaboration
5. **Assets are referenced, not embedded** — scene graph stores `assetId`, actual files live in storage
6. **Figma is the design source of truth** — all colors, spacing, typography, and UI styling come from the Figma file via Figma MCP. No hardcoded design tokens in the PRD or codebase.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14+ (App Router)** | Framework, API routes, SSR for marketing/auth pages |
| **React 18+** | UI framework |
| **TypeScript** | Type safety (strict mode) |
| **@react-three/fiber** | React wrapper for Three.js |
| **@react-three/drei** | Helper utilities (OrbitControls, TransformControls, etc.) |
| **Three.js** | 3D rendering engine (peer dep of R3F) |
| **Zustand** | State management (editor store, UI store) |
| **Immer** | Immutable state updates (Zustand middleware) |
| **Tailwind CSS** | Styling |
| **Radix UI / shadcn/ui** | Accessible UI primitives for panels, dialogs, menus |

### Backend / Infrastructure
| Technology | Purpose |
|---|---|
| **Supabase** | Postgres DB, Auth, Storage, Edge Functions, Row-Level Security |
| **Supabase Auth** | User authentication (email, Google, GitHub providers) |
| **Supabase Storage** | Asset file storage (.glb, textures, thumbnails) |
| **Supabase Edge Functions** | AI API proxy, asset processing |

### AI Services
| Service | Purpose |
|---|---|
| **Meshy / Tripo3D** | Text-to-3D model generation |
| **Anthropic Claude API** | Natural language → structured editor actions |
| **OpenAI API** (fallback) | Alternative LLM for action generation |

### Development Tooling
| Tool | Purpose |
|---|---|
| **Claude Code** | AI-assisted development |
| **ESLint + Prettier** | Code quality |
| **Vitest** | Unit testing |
| **Playwright** | E2E testing |

---

## Data Models & Schema

### Supabase Postgres Schema

```sql
-- Users (managed by Supabase Auth, extended with profile)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project sharing (future-proofing)
CREATE TABLE public.project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, shared_with_id)
);

-- Assets (3D files, textures, etc.)
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'model', 'texture', 'hdri'
  file_format TEXT NOT NULL, -- 'glb', 'gltf', 'obj', 'fbx', 'stl', 'png', 'jpg', 'hdr'
  storage_path TEXT NOT NULL, -- path in Supabase Storage
  file_size_bytes BIGINT,
  metadata JSONB DEFAULT '{}', -- bounding box, vertex count, etc.
  source TEXT NOT NULL CHECK (source IN ('upload', 'ai_generated', 'library')),
  ai_prompt TEXT, -- if AI generated, store the prompt
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenes (the actual editor state)
CREATE TABLE public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Scene',
  scene_graph JSONB NOT NULL DEFAULT '{}', -- the full scene state (see TypeScript types below)
  version INTEGER NOT NULL DEFAULT 1, -- for conflict detection
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI conversation history per project
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]', -- array of {role, content, timestamp}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_assets_project ON public.assets(project_id);
CREATE INDEX idx_scenes_project ON public.scenes(project_id);
CREATE INDEX idx_project_shares_shared_with ON public.project_shares(shared_with_id);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read/write their own data
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (owner_id = auth.uid() OR is_public = TRUE OR id IN (
    SELECT project_id FROM public.project_shares WHERE shared_with_id = auth.uid()
  ));

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Users can view project assets"
  ON public.assets FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid() OR is_public = TRUE
  ));

CREATE POLICY "Users can manage own project assets"
  ON public.assets FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view project scenes"
  ON public.scenes FOR SELECT
  USING (project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid() OR is_public = TRUE
  ));

CREATE POLICY "Users can manage scenes in own projects"
  ON public.scenes FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage own conversations"
  ON public.ai_conversations FOR ALL
  USING (user_id = auth.uid());
```

### TypeScript Types — Scene Graph

```typescript
// ============================================================
// SCENE GRAPH TYPES
// These types define the structure stored in scenes.scene_graph
// ============================================================

/** Root scene state — this is what gets serialized to DB */
export type SceneState = {
  version: number; // schema version for migrations
  objects: Record<string, SceneObject>;
  lighting: LightingConfig;
  camera: CameraState;
  environment: EnvironmentConfig;
};

/** A single object in the scene */
export type SceneObject = {
  id: string;
  name: string;
  parentId: string | null; // for grouping / hierarchy
  assetId: string; // references assets table
  visible: boolean;
  locked: boolean; // prevents selection/editing
  transform: Transform;
  materialOverrides: MaterialOverride[];
  metadata: Record<string, unknown>; // extensible per-object data
};

export type Transform = {
  position: [number, number, number];
  rotation: [number, number, number]; // euler angles in radians
  scale: [number, number, number];
};

/** Override a specific material on the loaded model */
export type MaterialOverride = {
  materialIndex: number; // which material slot to override
  color?: string; // hex color
  roughness?: number; // 0-1
  metalness?: number; // 0-1
  opacity?: number; // 0-1
  emissive?: string; // hex color
  emissiveIntensity?: number;
  textureAssetId?: string; // reference to a texture asset
};

export type LightingConfig = {
  ambientLight: {
    color: string;
    intensity: number;
  };
  directionalLights: DirectionalLightConfig[];
  pointLights: PointLightConfig[];
};

export type DirectionalLightConfig = {
  id: string;
  color: string;
  intensity: number;
  position: [number, number, number];
  castShadow: boolean;
};

export type PointLightConfig = {
  id: string;
  color: string;
  intensity: number;
  position: [number, number, number];
  distance: number;
  decay: number;
};

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number]; // OrbitControls target
  fov: number;
  near: number;
  far: number;
};

export type EnvironmentConfig = {
  backgroundColor: string;
  hdriAssetId?: string; // optional HDRI environment map
  showGrid: boolean;
  gridSize: number;
};
```

### TypeScript Types — Editor Actions

```typescript
// ============================================================
// EDITOR ACTIONS
// Every state mutation goes through this system.
// This enables undo/redo, AI integration, and serialization.
// ============================================================

export type EditorAction =
  | { type: "ADD_OBJECT"; payload: Omit<SceneObject, "id">; id: string }
  | { type: "DELETE_OBJECT"; id: string }
  | { type: "DUPLICATE_OBJECT"; sourceId: string; newId: string }
  | { type: "SELECT_OBJECT"; id: string | null }
  | { type: "MULTI_SELECT"; ids: string[] }
  | { type: "TRANSFORM_OBJECT"; id: string; transform: Partial<Transform> }
  | { type: "UPDATE_MATERIAL"; id: string; overrides: MaterialOverride[] }
  | { type: "RENAME_OBJECT"; id: string; name: string }
  | { type: "SET_VISIBILITY"; id: string; visible: boolean }
  | { type: "SET_LOCKED"; id: string; locked: boolean }
  | { type: "REPARENT_OBJECT"; id: string; newParentId: string | null }
  | { type: "UPDATE_LIGHTING"; lighting: Partial<LightingConfig> }
  | { type: "UPDATE_CAMERA"; camera: Partial<CameraState> }
  | { type: "UPDATE_ENVIRONMENT"; environment: Partial<EnvironmentConfig> }
  | { type: "BATCH_ACTIONS"; actions: EditorAction[] }; // for AI multi-step edits

/** Actions that should NOT be recorded in undo history */
export const TRANSIENT_ACTIONS: EditorAction["type"][] = [
  "SELECT_OBJECT",
  "MULTI_SELECT",
  "UPDATE_CAMERA",
];
```

---

## Editor Core — State Engine

The editor store is the heart of the application. It uses Zustand with Immer middleware for immutable updates.

### Store Structure

```typescript
// ============================================================
// EDITOR STORE
// ============================================================

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type EditorStore = {
  // Scene state
  scene: SceneState;

  // Selection
  selectedObjectId: string | null;
  multiSelectedIds: string[];

  // Undo/Redo
  past: SceneState[];
  future: SceneState[];
  maxHistorySize: number; // default 50

  // UI State
  activeTool: "select" | "translate" | "rotate" | "scale";
  sidebarTab: "hierarchy" | "properties" | "assets";

  // Actions
  dispatch: (action: EditorAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Serialization
  getSerializableState: () => SceneState;
  loadScene: (state: SceneState) => void;
};
```

### Dispatch Logic (Pseudocode)

```typescript
dispatch: (action: EditorAction) => {
  // 1. Snapshot current state for undo (if not transient)
  if (!TRANSIENT_ACTIONS.includes(action.type)) {
    set((state) => {
      state.past.push(structuredClone(state.scene));
      if (state.past.length > state.maxHistorySize) {
        state.past.shift();
      }
      state.future = []; // clear redo stack
    });
  }

  // 2. Apply action via reducer
  set((state) => {
    applyAction(state, action);
  });
}
```

### Reducer Pattern

```typescript
function applyAction(state: EditorStore, action: EditorAction): void {
  switch (action.type) {
    case "ADD_OBJECT":
      state.scene.objects[action.id] = { ...action.payload, id: action.id };
      break;

    case "DELETE_OBJECT":
      delete state.scene.objects[action.id];
      if (state.selectedObjectId === action.id) {
        state.selectedObjectId = null;
      }
      break;

    case "TRANSFORM_OBJECT": {
      const obj = state.scene.objects[action.id];
      if (obj) {
        Object.assign(obj.transform, action.transform);
      }
      break;
    }

    case "UPDATE_MATERIAL": {
      const obj = state.scene.objects[action.id];
      if (obj) {
        obj.materialOverrides = action.overrides;
      }
      break;
    }

    case "BATCH_ACTIONS":
      for (const subAction of action.actions) {
        applyAction(state, subAction);
      }
      break;

    // ... other cases
  }
}
```

---

## AI Integration Layer

### Architecture

AI never touches the renderer or store directly. The flow is:

```
User message → API route → LLM (with scene context) → Structured EditorAction[] → Validate → Dispatch
```

### API Route: `/api/ai/edit`

```typescript
// Pseudocode for the AI editing endpoint

export async function POST(req: Request) {
  const { message, sceneContext, conversationHistory } = await req.json();

  // Build system prompt with scene context
  const systemPrompt = buildEditorSystemPrompt(sceneContext);

  // Call LLM
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: "user", content: message },
    ],
    // Use tool_use to enforce structured output
    tools: [
      {
        name: "execute_editor_actions",
        description: "Execute one or more editor actions on the 3D scene",
        input_schema: {
          type: "object",
          properties: {
            actions: {
              type: "array",
              items: { /* EditorAction JSON schema */ },
            },
            explanation: {
              type: "string",
              description: "Brief explanation of what was done",
            },
          },
          required: ["actions", "explanation"],
        },
      },
    ],
  });

  // Extract and validate actions
  const toolUse = response.content.find((c) => c.type === "tool_use");
  const validatedActions = validateActions(toolUse.input.actions, sceneContext);

  return Response.json({
    actions: validatedActions,
    explanation: toolUse.input.explanation,
    assistantMessage: response.content.find((c) => c.type === "text")?.text,
  });
}
```

### System Prompt for Editor AI

The LLM receives:
1. The full scene graph (object IDs, names, transforms, materials)
2. The EditorAction schema
3. The currently selected object (if any)
4. Conversation history

This allows it to reference objects by ID and produce valid actions.

### API Route: `/api/ai/generate`

```typescript
// Pseudocode for text-to-3D generation

export async function POST(req: Request) {
  const { prompt, projectId, userId } = await req.json();

  // Call text-to-3D API (e.g., Meshy)
  const meshyResponse = await meshy.createTextTo3D({
    prompt,
    art_style: "realistic",
    topology: "triangle",
  });

  // Poll for completion (Meshy is async)
  const result = await pollForCompletion(meshyResponse.task_id);

  // Download the .glb file
  const glbBuffer = await fetch(result.model_url).then((r) => r.arrayBuffer());

  // Upload to Supabase Storage
  const storagePath = `${userId}/${projectId}/${crypto.randomUUID()}.glb`;
  await supabase.storage.from("assets").upload(storagePath, glbBuffer);

  // Create asset record
  const { data: asset } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      owner_id: userId,
      name: prompt.slice(0, 50),
      file_type: "model",
      file_format: "glb",
      storage_path: storagePath,
      source: "ai_generated",
      ai_prompt: prompt,
    })
    .select()
    .single();

  return Response.json({ asset, storageUrl: getPublicUrl(storagePath) });
}
```

### Action Validation

Before dispatching AI-returned actions, validate:
- Referenced object IDs exist in the scene
- Transform values are finite numbers
- Material values are in valid ranges (0-1 for roughness, etc.)
- Action types are recognized
- No malicious or unexpected fields

```typescript
function validateActions(
  actions: EditorAction[],
  sceneContext: SceneState
): EditorAction[] {
  return actions.filter((action) => {
    // Check object exists for object-targeting actions
    if ("id" in action && action.type !== "ADD_OBJECT") {
      if (!sceneContext.objects[action.id]) {
        console.warn(`AI referenced non-existent object: ${action.id}`);
        return false;
      }
    }
    // Clamp numeric values
    if (action.type === "UPDATE_MATERIAL") {
      action.overrides = action.overrides.map((o) => ({
        ...o,
        roughness: o.roughness != null ? clamp(o.roughness, 0, 1) : undefined,
        metalness: o.metalness != null ? clamp(o.metalness, 0, 1) : undefined,
        opacity: o.opacity != null ? clamp(o.opacity, 0, 1) : undefined,
      }));
    }
    return true;
  });
}
```

---

## 3D Rendering Layer

### Viewport Component Architecture

```
<EditorViewport>
  <Canvas>
    <SceneRenderer />           ← reads from store, renders all objects
    <SelectionHandler />        ← raycasting for object selection
    <TransformGizmo />          ← TransformControls for selected object
    <CameraController />        ← OrbitControls synced with store
    <EnvironmentSetup />        ← grid, HDRI, background
    <LightingRenderer />        ← renders lights from store
  </Canvas>
</EditorViewport>
```

### Critical Rendering Rules

1. **Components read from store via selectors** — never pass Three.js objects as props between React components
2. **Use `useFrame` sparingly** — only for animation, not for state sync
3. **Dispose on unmount** — every component that creates geometry/material/texture must dispose on cleanup
4. **Use `React.Suspense`** for model loading with `useGLTF`
5. **Asset cache** — never load the same .glb twice; use a centralized asset registry

### Asset Cache Pattern

```typescript
// Centralized asset loading to prevent duplicate downloads
const assetCache = new Map<string, THREE.Group>();

function useAsset(assetId: string, url: string): THREE.Group {
  if (assetCache.has(assetId)) {
    return assetCache.get(assetId)!.clone();
  }
  const { scene } = useGLTF(url);
  assetCache.set(assetId, scene);
  return scene.clone();
}
```

### Object Disposal

```typescript
function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
    }
  });
}
```

---

## Asset Pipeline

### Upload Normalization

When a user uploads a 3D file or AI generates one, the following normalization runs **client-side for preview, server-side for storage**:

```typescript
function normalizeModel(scene: THREE.Group): NormalizationResult {
  // 1. Compute bounding box
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // 2. Center the pivot point
  scene.position.sub(center);

  // 3. Auto-scale to target unit size (e.g., fits in 2x2x2 cube)
  const maxDim = Math.max(size.x, size.y, size.z);
  const TARGET_SIZE = 2;
  if (maxDim > 0) {
    const scaleFactor = TARGET_SIZE / maxDim;
    scene.scale.multiplyScalar(scaleFactor);
  }

  // 4. Reset transforms
  scene.updateMatrixWorld(true);

  return {
    originalSize: size,
    scaleFactor,
    vertexCount: countVertices(scene),
    materialCount: countMaterials(scene),
  };
}
```

### Supported Formats

| Format | Import | Export | Loader |
|--------|--------|--------|--------|
| `.glb` / `.gltf` | ✅ | ✅ | GLTFLoader (built into drei) |
| `.obj` | ✅ | ❌ | OBJLoader |
| `.fbx` | ✅ | ❌ | FBXLoader |
| `.stl` | ✅ | ❌ | STLLoader |

### Export Pipeline

For scene export, convert the current scene state to glTF/glb:

```typescript
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";

async function exportScene(scene: THREE.Scene): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(scene, (result) => resolve(result as ArrayBuffer), reject, {
      binary: true,
    });
  });
}
```

---

## Authentication & Authorization

### Supabase Auth Setup

- **Providers**: Email/password, Google OAuth, GitHub OAuth
- **Session management**: Supabase handles JWT tokens automatically
- **Client-side**: Use `@supabase/supabase-js` with `createClientComponentClient()`
- **Server-side**: Use `createServerComponentClient()` in API routes

### Authorization Rules

All authorization is enforced via Supabase Row Level Security (defined in schema above):

- Users can only access their own projects and assets
- Public projects are read-only to others
- Shared projects respect `view` / `edit` permissions
- Storage bucket policies mirror RLS rules

### Storage Bucket Policy

```sql
-- Bucket: 'assets'
-- Users can upload to their own folder
CREATE POLICY "Users can upload own assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can read assets from projects they have access to
CREATE POLICY "Users can read accessible assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## API Design

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/projects` | GET | List user's projects |
| `/api/projects` | POST | Create new project |
| `/api/projects/[id]` | GET | Get project with scene |
| `/api/projects/[id]` | PUT | Update project metadata |
| `/api/projects/[id]` | DELETE | Delete project |
| `/api/projects/[id]/scene` | PUT | Save scene state |
| `/api/assets/upload` | POST | Upload 3D file |
| `/api/assets/[id]` | DELETE | Delete asset |
| `/api/ai/generate` | POST | Text-to-3D generation |
| `/api/ai/edit` | POST | AI scene editing |
| `/api/ai/conversation` | GET | Get conversation history |
| `/api/ai/conversation` | POST | Append to conversation |
| `/api/export/scene` | POST | Export scene as .glb |
| `/api/export/object/[id]` | GET | Export single object |

---

## File Storage Architecture

### Supabase Storage Buckets

```
assets/
  {user_id}/
    {project_id}/
      {asset_uuid}.glb
      {asset_uuid}.obj
      {asset_uuid}_thumb.png
      textures/
        {texture_uuid}.png

exports/
  {user_id}/
    {export_uuid}.glb
```

### Storage Rules
- Max file size: 50MB per upload (configurable)
- Accepted MIME types: model/gltf-binary, model/gltf+json, application/octet-stream, image/*
- Thumbnails generated server-side after upload (optional, can defer to v2)
- Signed URLs for private assets, public URLs for shared/public projects

---

## MCP Servers & Claude Code Tooling

### Recommended MCP Servers for Claude Code

| MCP Server | Purpose |
|---|---|
| **Figma MCP** | Pull design tokens, component specs, colors, spacing, and typography directly from Figma file |
| **Supabase MCP** | Direct database queries, schema management, RLS testing |
| **Context7** | Up-to-date documentation for R3F, Three.js, Zustand, Next.js |
| **Playwright MCP** | E2E testing of the editor in browser |
| **Filesystem MCP** | (Built-in) File read/write during development |

### Recommended VS Code Extensions

| Extension | Purpose |
|---|---|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Tailwind CSS IntelliSense** | Tailwind autocomplete |
| **Three.js Snippets** | Three.js code snippets |
| **Prisma** (if using Prisma with Supabase) | Schema highlighting |

### Claude Code Configuration

Create a `CLAUDE.md` file at the project root for Claude Code context:

```markdown
# CLAUDE.md

## Project: 3D AI Editor

### Tech Stack
- Next.js 14+ (App Router), React 18+, TypeScript (strict)
- @react-three/fiber, @react-three/drei, Three.js
- Zustand + Immer for state management
- Supabase (Postgres, Auth, Storage, Edge Functions)
- Tailwind CSS + shadcn/ui
- AI: Anthropic Claude API, Meshy API for 3D generation

### Architecture Rules
1. ALL state mutations go through EditorAction dispatch — never mutate Three.js directly
2. Three.js is a VIEW LAYER — it reads from the Zustand store
3. AI returns EditorAction[] — validate before dispatching
4. Every Three.js resource (geometry, material, texture) must be disposed on cleanup
5. Use Suspense boundaries around all model loading
6. Scene graph types are in `src/types/scene.ts`
7. Editor actions are in `src/types/actions.ts`
8. Store is in `src/store/editor-store.ts`
9. ALL colors, spacing, typography, and UI styling come from Figma via Figma MCP — never hardcode design tokens
10. ALL icons, graphics, and assets must be imported from the Figma file — do not generate your own. If an asset can't be extracted, use a named placeholder and log it in `PROGRESS.md` under "Blocked / Deferred" so I can provide it manually.

### File Structure
PROGRESS.md              # Living progress tracker — update after every completed feature
CLAUDE.md                # This file
src/
  app/                    # Next.js App Router pages
    (auth)/               # Auth pages (login, signup)
    (editor)/             # Editor page
    (marketing)/          # Landing page
    api/                  # API routes
  components/
    editor/               # Editor-specific components
      viewport/           # 3D viewport components
      panels/             # Sidebar panels
      chat/               # AI chat interface
      toolbar/            # Top toolbar
    ui/                   # shadcn/ui components
  store/
    editor-store.ts       # Main editor Zustand store
    ui-store.ts           # UI-only state (no undo/redo)
  types/
    scene.ts              # Scene graph types
    actions.ts            # Editor action types
    database.ts           # Supabase types (generated)
  lib/
    supabase/             # Supabase client utilities
    ai/                   # AI integration utilities
    three/                # Three.js utilities (loaders, disposal, normalization)
  hooks/                  # Custom React hooks

### Default Scene State
When creating a new project, initialize with this state. Colors for lighting and background
should be derived from Figma design tokens at implementation time.

```typescript
export const DEFAULT_SCENE_STATE: SceneState = {
  version: 1,
  objects: {},
  lighting: {
    ambientLight: { color: "", intensity: 0.5 },
    directionalLights: [
      {
        id: "default-dir-light",
        color: "",
        intensity: 1,
        position: [5, 10, 5],
        castShadow: true,
      },
    ],
    pointLights: [],
  },
  camera: {
    position: [5, 5, 5],
    target: [0, 0, 0],
    fov: 50,
    near: 0.1,
    far: 1000,
  },
  environment: {
    backgroundColor: "",
    showGrid: true,
    gridSize: 20,
  },
};
```

### Testing
- Unit tests: Vitest (store logic, action validation, normalization)
- E2E tests: Playwright (editor workflows)
- Run: `npm test` (unit), `npm run test:e2e` (E2E)

### Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run test` — Run unit tests
- `npm run test:e2e` — Run E2E tests
- `npm run lint` — Lint code
- `npm run db:types` — Regenerate Supabase types
```

---

## Progress Tracking

A `PROGRESS.md` file must be maintained at the project root and updated by Claude Code upon completion of every feature or sub-task. This serves as a living record of project status and provides session context for Claude Code.

### PROGRESS.md Structure

```markdown
# Progress Tracker

## Current Phase
Phase 1 — Deterministic Editor Core

## Completed
- [x] Project scaffolding (Next.js + TS + Tailwind + shadcn/ui) — 2026-XX-XX
- [x] Type definitions (SceneState, EditorAction, Transform) — 2026-XX-XX

## In Progress
- [ ] Zustand editor store with Immer

## Blocked / Deferred
- (none)

## Decisions & Notes
- (log any architectural decisions, trade-offs, or deviations from the PRD here)

## Known Issues
- (bugs or technical debt to address later)
```

### Update Rules
1. Claude Code updates `PROGRESS.md` after completing each feature or sub-task
2. Each completed item includes the date of completion
3. Any deviation from the PRD is logged in "Decisions & Notes" with reasoning
4. Blocked items include a brief explanation of what they're waiting on
5. Known issues are logged immediately when discovered, not deferred

---

## Evolving Design

The Figma file is a **living document**. Not all screens and UI states will exist at the start of the project. New screens, components, and flows will be added to Figma as the product direction becomes clearer during implementation.

### How This Affects Development
- **Phase 1–2** designs are expected to be mostly complete in Figma before implementation begins
- **Phase 3+** designs may be added during or after earlier phases are built
- When a phase references UI that doesn't yet exist in Figma, Claude Code should flag it and proceed with functional placeholder UI that matches the existing design language
- When new Figma screens are added, Claude Code should reference them via Figma MCP and update the implemented UI to match
- The `PROGRESS.md` "Decisions & Notes" section should log any cases where placeholder UI was used due to missing designs

### Design Handoff Flow
```
New design added to Figma → Developer references it via Figma MCP
→ Claude Code pulls design context → Implementation or UI update
→ PROGRESS.md updated with what changed
```

---

## Implementation Phases

### Phase 1: Deterministic Editor Core (Weeks 1–3) ✅ COMPLETE
**Goal:** A working 3D editor with NO AI — just manual tools.

- [x] Project scaffolding: Next.js + TypeScript + Tailwind (shadcn/ui deferred — using plain Tailwind)
- [x] Define all types: `SceneState`, `SceneObject`, `EditorAction`, `Transform`, etc.
- [x] Implement Zustand editor store with Immer
- [x] Implement action dispatch + reducer
- [x] Implement undo/redo (past/future stacks)
- [x] Build viewport: Canvas + OrbitControls + grid + lighting
- [x] Object rendering from store (primitives: cube, sphere, plane, cylinder, cone, torus)
- [x] Object selection via raycasting
- [x] TransformControls (translate, rotate, scale) for selected object
- [x] Scene hierarchy panel (list of objects, click to select, visibility/lock toggles)
- [x] Properties panel (shows/edits transform + material of selected object)
- [x] Toolbar (select/translate/rotate/scale mode, add primitive, undo/redo, duplicate, delete)
- [x] Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo), Delete, Ctrl+D (duplicate), V/G/R/S tool keys
- [x] Landing page (`/`) from Figma design — nav, hero, video preview, features grid, footer
- [x] Sign-in page (`/sign-in`) from Figma design — Google OAuth, email form, hero image, trust logos, custom fonts (PP Mondwest + Aeonik Pro), gem logo SVG
- [x] Route structure: `/` (landing), `/sign-in` (auth), `/editor` (3D editor)

**Success criteria:** User can add primitives, select, transform, undo, and the store is the single source of truth. ✅ MET

### Phase 2: Persistence & Auth (Weeks 4–5) ✅ COMPLETE
**Goal:** Users can sign in, save, and load projects.

- [x] Supabase setup: database schema (6 tables), RLS policies, storage buckets (assets + thumbnails), triggers
- [x] Auth: sign up, sign in, sign out (email magic link + Google OAuth) with middleware session refresh
- [x] Create/list/delete projects (dashboard page + API routes)
- [x] Save scene state to DB (serialize store → JSON → PUT /api/projects/[id]/scene)
- [x] Load scene state from DB (GET /api/projects/[id] → hydrate store → render)
- [x] Auto-save (30s interval + on blur + on beforeunload via sendBeacon) + manual Ctrl+S
- [x] Project thumbnail generation (canvas → blob → Supabase Storage → project metadata)

**Success criteria:** User can sign in, create a project, add objects, close browser, reopen, and scene is exactly as they left it. ✅ MET

### Phase 3: Asset Upload & Management (Week 6)
**Goal:** Users can upload and manage their own 3D files.

- [ ] File upload UI (drag-and-drop + file picker)
- [ ] Format detection and loader selection (.glb, .obj, .fbx, .stl)
- [ ] Upload normalization pipeline (scale, center, fix)
- [ ] Upload to Supabase Storage
- [ ] Asset record creation in DB
- [ ] Load uploaded assets into scene
- [ ] Asset panel in sidebar (list uploaded assets, click to add to scene)
- [ ] Delete asset (remove from storage + DB)

**Success criteria:** User can upload a .glb file, it appears correctly scaled in the scene, and persists across sessions.

### Phase 4: AI Structured Editing (Weeks 7–8)
**Goal:** Users can edit scene properties via natural language.

- [ ] AI chat panel UI
- [ ] API route: `/api/ai/edit`
- [ ] System prompt builder (injects scene context + EditorAction schema)
- [ ] LLM tool_use for structured action output
- [ ] Action validation layer
- [ ] Dispatch validated actions to store
- [ ] Conversation history (stored in DB, displayed in chat)
- [ ] Loading states + error handling for AI responses

**Success criteria:** User can type "make the cube metallic and move it up 2 units" and the scene updates correctly with undo support.

### Phase 5: AI 3D Generation (Weeks 9–10)
**Goal:** Users can generate 3D models from text prompts.

- [ ] Meshy / Tripo3D API integration
- [ ] API route: `/api/ai/generate`
- [ ] Async polling for generation completion
- [ ] Model cleanup pipeline (normalize scale, center, fix normals)
- [ ] Upload generated model to storage
- [ ] Insert into scene as new object
- [ ] Generation progress UI (loading state, progress %)
- [ ] Prompt history

**Success criteria:** User types "a medieval sword" → model generates → appears in scene at correct scale → can be manipulated and saved.

### Phase 6: Export & Polish (Weeks 11–12)
**Goal:** Users can export their work and the app feels polished.

- [ ] Export full scene as .glb
- [ ] Export individual objects
- [ ] Download to local filesystem
- [ ] HDRI environment map support
- [ ] Custom lighting editing in properties panel
- [ ] Responsive layout
- [ ] Loading skeletons and empty states
- [ ] Error boundaries
- [ ] Performance audit (dispose checks, memory profiling)

---

## Non-Functional Requirements

### Performance
- **Viewport FPS**: ≥30fps with ≤20 objects in scene
- **Initial load**: <3s to interactive editor
- **Model load**: <5s for files under 10MB
- **Memory**: No leaks — all Three.js resources disposed on removal
- **Asset cache**: Same model loaded once regardless of instance count

### Security
- All API routes authenticated via Supabase JWT
- RLS enforced on all tables
- AI API keys stored as server-side environment variables only
- File upload validation: type check, size limit, malware scan (future)
- Rate limiting on AI endpoints (suggest: 20 generations/hour, 100 edits/hour)

### Accessibility
- Keyboard navigation for all toolbar and panel actions
- Screen reader labels for key UI elements
- Sufficient color contrast in the dark theme
- Focus management when switching between chat and viewport

### Browser Support
- Chrome 100+ (primary)
- Firefox 100+
- Safari 16+ (WebGL2 support required)
- Edge 100+
- Mobile: responsive layout but editor functionality is desktop-primary


