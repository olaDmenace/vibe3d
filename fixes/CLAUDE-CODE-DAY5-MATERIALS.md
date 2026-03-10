# Vibe3D — DAY 5: Material Presets + Asset Library

Quick-apply professional materials to any object or mesh part. One click → chrome, wood, glass, fabric.

Apply ALL sections.

---

## Section 1: Material presets data

**File:** Create `src/lib/material-presets.ts`

```ts
export interface MaterialPreset {
  id: string;
  name: string;
  category: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  emissive?: string;
  emissiveIntensity?: number;
  thumbnail?: string; // CSS gradient or color for visual preview
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  // Metals
  { id: "chrome", name: "Chrome", category: "Metal", color: "#d4d4d8", roughness: 0.05, metalness: 1, opacity: 1, thumbnail: "linear-gradient(135deg, #e4e4e7, #71717a, #e4e4e7)" },
  { id: "gold", name: "Gold", category: "Metal", color: "#eab308", roughness: 0.15, metalness: 1, opacity: 1, thumbnail: "linear-gradient(135deg, #fde047, #ca8a04, #fde047)" },
  { id: "copper", name: "Copper", category: "Metal", color: "#c2712e", roughness: 0.2, metalness: 1, opacity: 1, thumbnail: "linear-gradient(135deg, #d4956a, #92400e, #d4956a)" },
  { id: "brushed-steel", name: "Brushed Steel", category: "Metal", color: "#9ca3af", roughness: 0.4, metalness: 0.9, opacity: 1, thumbnail: "linear-gradient(135deg, #d1d5db, #6b7280, #d1d5db)" },
  { id: "bronze", name: "Bronze", category: "Metal", color: "#92702a", roughness: 0.3, metalness: 0.85, opacity: 1, thumbnail: "linear-gradient(135deg, #b8923e, #6b4e1e, #b8923e)" },

  // Natural
  { id: "wood-oak", name: "Oak Wood", category: "Natural", color: "#a0764a", roughness: 0.7, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #c4956a, #7a5c3a)" },
  { id: "wood-walnut", name: "Walnut", category: "Natural", color: "#5c3d2e", roughness: 0.65, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #7a5040, #3e2a1e)" },
  { id: "stone", name: "Stone", category: "Natural", color: "#78716c", roughness: 0.85, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #a8a29e, #57534e)" },
  { id: "marble", name: "Marble", category: "Natural", color: "#e7e5e4", roughness: 0.2, metalness: 0.05, opacity: 1, thumbnail: "linear-gradient(135deg, #fafaf9, #d6d3d1, #fafaf9)" },
  { id: "clay", name: "Clay", category: "Natural", color: "#c4a882", roughness: 0.9, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #d4b896, #a08060)" },

  // Synthetic
  { id: "plastic-glossy", name: "Glossy Plastic", category: "Synthetic", color: "#e4e4e7", roughness: 0.1, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #f4f4f5, #a1a1aa, #f4f4f5)" },
  { id: "plastic-matte", name: "Matte Plastic", category: "Synthetic", color: "#d4d4d8", roughness: 0.6, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #e4e4e7, #a1a1aa)" },
  { id: "rubber", name: "Rubber", category: "Synthetic", color: "#27272a", roughness: 0.9, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #3f3f46, #18181b)" },
  { id: "glass", name: "Glass", category: "Synthetic", color: "#e0f2fe", roughness: 0.0, metalness: 0.1, opacity: 0.3, thumbnail: "linear-gradient(135deg, rgba(224,242,254,0.5), rgba(186,230,253,0.3))" },
  { id: "ceramic", name: "Ceramic", category: "Synthetic", color: "#fafaf9", roughness: 0.15, metalness: 0.05, opacity: 1, thumbnail: "linear-gradient(135deg, #fafaf9, #e7e5e4, #fafaf9)" },

  // Fabric
  { id: "fabric-cotton", name: "Cotton", category: "Fabric", color: "#f5f5f4", roughness: 0.95, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #fafaf9, #e7e5e4)" },
  { id: "fabric-leather", name: "Leather", category: "Fabric", color: "#44403c", roughness: 0.5, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #57534e, #292524)" },
  { id: "fabric-velvet", name: "Velvet", category: "Fabric", color: "#4c1d95", roughness: 0.85, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #6d28d9, #3b0764)" },
  { id: "fabric-denim", name: "Denim", category: "Fabric", color: "#1e40af", roughness: 0.8, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #2563eb, #1e3a8a)" },

  // Special
  { id: "neon-glow", name: "Neon Glow", category: "Special", color: "#06b6d4", roughness: 0.3, metalness: 0, opacity: 1, emissive: "#06b6d4", emissiveIntensity: 2, thumbnail: "linear-gradient(135deg, #22d3ee, #0891b2)" },
  { id: "lava", name: "Lava", category: "Special", color: "#dc2626", roughness: 0.6, metalness: 0, opacity: 1, emissive: "#ef4444", emissiveIntensity: 1.5, thumbnail: "linear-gradient(135deg, #f87171, #991b1b)" },
];

export const MATERIAL_CATEGORIES = [...new Set(MATERIAL_PRESETS.map((p) => p.category))];
```

---

## Section 2: Material presets panel in right sidebar

**File:** Create `src/components/editor/panels/material-presets-panel.tsx`

```tsx
"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/editor-store";
import { MATERIAL_PRESETS, MATERIAL_CATEGORIES, type MaterialPreset } from "@/lib/material-presets";

export function MaterialPresetsPanel() {
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const selectedObject = useEditorStore((s) =>
    s.selectedObjectId ? s.scene.objects[s.selectedObjectId] : null
  );
  const highlightedMeshName = useEditorStore((s) => s.highlightedMeshName);
  const dispatch = useEditorStore((s) => s.dispatch);
  const [activeCategory, setActiveCategory] = useState<string>("Metal");

  if (!selectedObject || !selectedObjectId) return null;

  function applyPreset(preset: MaterialPreset) {
    if (!selectedObjectId) return;

    const override: Record<string, unknown> = {
      materialIndex: 0,
      color: preset.color,
      roughness: preset.roughness,
      metalness: preset.metalness,
      opacity: preset.opacity,
    };

    if (highlightedMeshName) {
      override.meshName = highlightedMeshName;
    }

    if (preset.emissive) {
      override.emissive = preset.emissive;
      override.emissiveIntensity = preset.emissiveIntensity;
    }

    // Keep other overrides, replace the one for this target
    const otherOverrides = selectedObject!.materialOverrides.filter((o) => {
      if (highlightedMeshName) return o.meshName !== highlightedMeshName;
      return !!o.meshName;
    });

    dispatch({
      type: "UPDATE_MATERIAL",
      id: selectedObjectId,
      overrides: [...otherOverrides, override as any],
    });
  }

  const targetLabel = highlightedMeshName
    ? highlightedMeshName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Whole object";

  const filteredPresets = MATERIAL_PRESETS.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-[var(--text-dim)] uppercase tracking-wider">
        Material Presets
      </h3>
      <p className="text-[11px] text-[var(--text-dim)]">
        Applying to: {targetLabel}
      </p>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {MATERIAL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`px-2.5 py-1 rounded-full text-[11px] flex-shrink-0 transition-colors ${
              activeCategory === cat
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-[var(--text-dim)] hover:text-[var(--text-secondary)] border border-transparent"
            }`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {filteredPresets.map((preset) => (
          <button
            key={preset.id}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-[var(--accent-bg)] transition-colors group"
            onClick={() => applyPreset(preset)}
            title={`Apply ${preset.name}`}
          >
            <div
              className="w-8 h-8 rounded-lg border border-[var(--border)] group-hover:border-[var(--border-strong)] transition-colors shadow-sm"
              style={{ background: preset.thumbnail || preset.color }}
            />
            <span className="text-[10px] text-[var(--text-dim)] group-hover:text-[var(--text-secondary)] truncate max-w-full transition-colors">
              {preset.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Wire into the right sidebar

**File:** `src/components/editor/panels/right-sidebar.tsx`

Add after MaterialEditor:

```tsx
import { MaterialPresetsPanel } from "./material-presets-panel";

// After MaterialEditor:
<MaterialPresetsPanel />
```

**Verify:**
```bash
npx tsc --noEmit
grep -n "MaterialPresetsPanel" src/components/editor/panels/right-sidebar.tsx
```

---

## Section 3: Asset library panel

Show all generated/uploaded assets for the project, allowing re-use.

### A. Create asset library component

**File:** Create `src/components/editor/panels/asset-library-panel.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { useEditorStore } from "@/store/editor-store";
import { createClient } from "@/lib/supabase/client";

interface ProjectAsset {
  id: string;
  name: string;
  storage_path: string;
  source: string;
  ai_prompt: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function AssetLibraryPanel({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useEditorStore((s) => s.dispatch);

  useEffect(() => {
    async function loadAssets() {
      const supabase = createClient();
      const { data } = await supabase
        .from("assets")
        .select("id, name, storage_path, source, ai_prompt, metadata, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      setAssets(data ?? []);
      setLoading(false);
    }
    loadAssets();
  }, [projectId]);

  function addAssetToScene(asset: ProjectAsset) {
    const supabase = createClient();
    // Get a signed URL for the model
    supabase.storage
      .from("assets")
      .createSignedUrl(asset.storage_path, 3600)
      .then(({ data }) => {
        if (!data?.signedUrl) return;

        const spawnPos = getSpawnPosition(useEditorStore.getState().scene);
        const objId = crypto.randomUUID();

        dispatch({
          type: "ADD_OBJECT",
          id: objId,
          payload: {
            name: asset.name || "Asset",
            parentId: null,
            assetId: asset.id,
            visible: true,
            locked: false,
            transform: {
              position: spawnPos,
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            materialOverrides: [],
            metadata: {
              modelUrl: data.signedUrl,
              meshNames: (asset.metadata?.meshNames as string[]) ?? [],
              meshCount: (asset.metadata?.meshCount as number) ?? 0,
            },
          },
        });

        dispatch({ type: "SELECT_OBJECT", id: objId });
      });
  }

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-[var(--input-bg)] rounded-lg" />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-[var(--text-dim)]">No assets yet</p>
        <p className="text-[11px] text-[var(--text-dim)] mt-1">
          Generate or upload models to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {assets.map((asset) => {
        const thumbnailUrl = asset.metadata?.thumbnailUrl as string | undefined;

        return (
          <button
            key={asset.id}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--accent-bg)] transition-colors text-left"
            onClick={() => addAssetToScene(asset)}
            title={`Add "${asset.name}" to scene`}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={asset.name}
                className="w-10 h-10 rounded-lg object-cover border border-[var(--border-subtle)] flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[var(--input-bg)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0">
                <span className="text-[var(--text-dim)] text-xs">3D</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--text-secondary)] truncate">{asset.name}</p>
              <p className="text-[10px] text-[var(--text-dim)]">
                {asset.source === "ai_generated" ? "AI Generated" : "Uploaded"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Import getSpawnPosition from shared utils
import { getSpawnPosition } from "@/lib/scene-utils";
```

Make sure `getSpawnPosition` is importable from a shared location. If it's currently defined only in chat-panel.tsx, move it to `src/lib/scene-utils.ts`.

### B. Wire into right sidebar

Add as a new section in the right sidebar:

```tsx
import { AssetLibraryPanel } from "./asset-library-panel";

// In the sidebar, after Image Assets or at the bottom:
<SidebarSection title="Asset Library">
  <AssetLibraryPanel projectId={projectId} />
</SidebarSection>
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
### Day 5 — Material Presets + Asset Library — YYYY-MM-DD
- [x] 22 material presets across 5 categories (Metal, Natural, Synthetic, Fabric, Special)
- [x] Material presets panel with category tabs and visual swatches
- [x] One-click preset application to selected object or highlighted mesh part
- [x] Asset library panel showing all project assets with thumbnails
- [x] Click-to-add-to-scene from asset library (reuse previous generations)
```
