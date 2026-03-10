# Vibe3D — Rendering Quality Upgrade

This is the single highest-impact visual improvement possible without changing any geometry. Apply ALL sections.

---

## Section 1: HDRI Environment Lighting

**File:** `src/components/editor/viewport/environment-setup.tsx` (or wherever the R3F environment/scene setup lives)

Replace flat lighting with HDRI environment-based lighting. This wraps the entire scene in realistic ambient light from every direction.

### Install dependency if needed

Check if `@react-three/drei` is already installed (it should be). The `Environment` component comes from drei.

### Add Environment component

```tsx
import { Environment } from "@react-three/drei";

// Inside your environment setup component:
export function EnvironmentSetup() {
  const environment = useEditorStore((s) => s.scene.environment);

  return (
    <>
      {/* HDRI environment lighting — this is the big upgrade */}
      <Environment
        preset="studio"     // Studio lighting for product-quality renders
        background={false}   // Don't show the HDRI as background (keep user's bg color)
        environmentIntensity={0.8}  // Slightly reduce to not overpower directional lights
      />

      {/* Grid */}
      {environment.showGrid && (
        <gridHelper
          args={[environment.gridSize, environment.gridSize, "#444444", "#2a2a2a"]}
        />
      )}
    </>
  );
}
```

If `EnvironmentSetup` doesn't exist as a separate component, find where the grid and background color are set up in the viewport and add the `<Environment>` component there.

**IMPORTANT:** The `<Environment>` must be inside the `<Canvas>` and inside `<Suspense>`. It loads an HDR file asynchronously.

### Add environment preset selector to the lighting editor

**File:** `src/components/editor/panels/lighting-editor.tsx`

Add a preset dropdown at the top of the lighting editor:

```tsx
const HDRI_PRESETS = [
  { label: "Studio", value: "studio" },
  { label: "City", value: "city" },
  { label: "Sunset", value: "sunset" },
  { label: "Dawn", value: "dawn" },
  { label: "Night", value: "night" },
  { label: "Warehouse", value: "warehouse" },
  { label: "Forest", value: "forest" },
  { label: "Apartment", value: "apartment" },
  { label: "Park", value: "park" },
  { label: "Lobby", value: "lobby" },
] as const;

// In the LightingEditor component:
<div className="space-y-2">
  <span className="text-xs text-[var(--text-dim)]">Environment</span>
  <select
    className="w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--text-secondary)] focus:border-indigo-500/50 focus:outline-none"
    value={currentPreset}
    onChange={(e) => {
      useEditorStore.setState({ hdriPreset: e.target.value });
    }}
  >
    {HDRI_PRESETS.map((p) => (
      <option key={p.value} value={p.value}>{p.label}</option>
    ))}
  </select>
</div>
```

### Store the HDRI preset in the editor store

**File:** `src/store/editor-store.ts`

Add to the store state:

```ts
hdriPreset: string;

// Initialize:
hdriPreset: "studio",
```

Then read it in the environment setup:

```tsx
const hdriPreset = useEditorStore((s) => s.hdriPreset);

<Environment
  preset={hdriPreset as any}
  background={false}
  environmentIntensity={0.8}
/>
```

**Verify:**
```bash
npx tsc --noEmit
grep -n "Environment\|hdriPreset" src/components/editor/viewport/ -r
```

---

## Section 2: Contact Shadows

**File:** `src/components/editor/viewport/environment-setup.tsx` (same file)

Add soft ground shadows beneath all objects. This grounds them visually instead of floating.

```tsx
import { Environment, ContactShadows } from "@react-three/drei";

export function EnvironmentSetup() {
  const environment = useEditorStore((s) => s.scene.environment);
  const hdriPreset = useEditorStore((s) => s.hdriPreset);

  return (
    <>
      <Environment
        preset={hdriPreset as any}
        background={false}
        environmentIntensity={0.8}
      />

      {/* Contact shadows — soft ground shadows */}
      <ContactShadows
        position={[0, -0.01, 0]}  // Slightly below ground plane
        opacity={0.4}
        scale={20}
        blur={2.5}
        far={10}
        color="#000000"
      />

      {/* Grid */}
      {environment.showGrid && (
        <gridHelper
          args={[environment.gridSize, environment.gridSize, "#444444", "#2a2a2a"]}
        />
      )}
    </>
  );
}
```

The `ContactShadows` component renders soft shadows by projecting from above. It's cheap and looks great.

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 3: Tone Mapping & Renderer Settings

**File:** `src/components/editor/viewport/editor-viewport.tsx` (or wherever the R3F `<Canvas>` is)

Improve the WebGL renderer settings for more realistic output:

```tsx
import * as THREE from "three";

<Canvas
  shadows
  gl={{
    preserveDrawingBuffer: true,
    toneMapping: THREE.ACESFilmicToneMapping,  // Cinematic tone mapping
    toneMappingExposure: 1.2,                  // Slightly bright for product feel
    outputColorSpace: THREE.SRGBColorSpace,    // Correct color space
    antialias: true,                           // Smooth edges
  }}
  camera={{
    position: camera.position,
    fov: camera.fov,
    near: camera.near,
    far: camera.far,
  }}
  onPointerMissed={handlePointerMissed}
>
```

If `toneMapping` and `outputColorSpace` are already set, just make sure they use these specific values. `ACESFilmicToneMapping` is the industry standard — it compresses highlights and lifts shadows naturally, just like a camera sensor.

**Verify:**
```bash
npx tsc --noEmit
grep -n "toneMapping\|ACESFilmic\|outputColorSpace" src/components/editor/viewport/ -r
```

---

## Section 4: Ambient Occlusion (SSAO)

Screen-space ambient occlusion darkens crevices and corners, adding depth. This is optional but adds noticeable realism.

**File:** `src/components/editor/viewport/editor-viewport.tsx`

Check if `@react-three/postprocessing` is installed. If not:

```bash
npm install @react-three/postprocessing postprocessing
```

Then add the effect composer inside the Canvas:

```tsx
import { EffectComposer, SSAO, Bloom } from "@react-three/postprocessing";

// Inside <Canvas>, after all scene elements:
<EffectComposer>
  <SSAO
    radius={0.1}
    intensity={30}
    luminanceInfluence={0.5}
    samples={21}
  />
  <Bloom
    luminanceThreshold={0.9}
    luminanceSmoothing={0.025}
    intensity={0.3}
  />
</EffectComposer>
```

**NOTE:** If adding postprocessing causes performance issues or conflicts with TransformControls, wrap it in a conditional so users can toggle it:

```tsx
const enablePostProcessing = useEditorStore((s) => s.enablePostProcessing ?? true);

{enablePostProcessing && (
  <EffectComposer>
    <SSAO radius={0.1} intensity={30} luminanceInfluence={0.5} samples={21} />
    <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.025} intensity={0.3} />
  </EffectComposer>
)}
```

Add `enablePostProcessing: true` to the store and a toggle in the lighting editor:

```tsx
{/* Rendering quality toggle */}
<div className="flex items-center justify-between">
  <span className="text-sm text-[var(--text-secondary)]">HD Rendering</span>
  <button
    className={`w-8 h-4 rounded-full transition-colors ${
      enablePostProcessing ? "bg-indigo-500" : "bg-[var(--input-bg)]"
    }`}
    onClick={() =>
      useEditorStore.setState((s) => ({
        enablePostProcessing: !s.enablePostProcessing,
      }))
    }
  >
    <div
      className={`w-3 h-3 rounded-full bg-white transition-transform ${
        enablePostProcessing ? "translate-x-4" : "translate-x-0.5"
      }`}
    />
  </button>
</div>
```

If `@react-three/postprocessing` can't be installed (network restrictions), skip this section entirely — the HDRI + contact shadows + tone mapping from Sections 1-3 already provide the major visual upgrade.

**Verify:**
```bash
npx tsc --noEmit
npm run build
```

---

## Section 5: Improve default lighting for generated models

**File:** `src/store/editor-store.ts`

Update the default scene lighting to complement the HDRI environment:

```ts
export const DEFAULT_SCENE_STATE: SceneState = {
  version: 1,
  objects: {},
  lighting: {
    ambientLight: {
      color: "#ffffff",
      intensity: 0.3,  // Reduced — HDRI provides most ambient light now
    },
    directionalLights: [
      {
        id: "default-dir-light",
        color: "#ffffff",
        intensity: 0.8,  // Reduced — serves as key light alongside HDRI
        position: [5, 10, 7],  // Slightly adjusted angle
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
    backgroundColor: "#1a1a2e",
    showGrid: true,
    gridSize: 20,
  },
};
```

With HDRI lighting providing ambient fill from all directions, the directional light now serves as a subtle key light rather than the primary light source. This prevents the flat, harsh look.

**NOTE:** This only affects NEW projects. Existing projects keep their saved lighting values.

**Verify:**
```bash
npx tsc --noEmit
```

---

## Section 6: Background color improvement

The current background `#1a1a2e` is fine for a dark editor, but for showcasing generated models, a subtle gradient or neutral tone looks more professional.

**File:** `src/components/editor/viewport/environment-setup.tsx`

Add a subtle background gradient using a Three.js scene background:

```tsx
import { useThree } from "@react-three/fiber";

function BackgroundSetup() {
  const { scene } = useThree();
  const bgColor = useEditorStore((s) => s.scene.environment.backgroundColor);

  useEffect(() => {
    scene.background = new THREE.Color(bgColor);
  }, [scene, bgColor]);

  return null;
}
```

Add `<BackgroundSetup />` inside the Canvas if not already present.

---

## Final Verification

```bash
npx tsc --noEmit && echo "TS PASS" || echo "TS FAIL"
npm run lint && echo "LINT PASS" || echo "LINT FAIL"
npm run build && echo "BUILD PASS" || echo "BUILD FAIL"
```

## Update PROGRESS.md

```markdown
### Rendering Quality Upgrade — YYYY-MM-DD
- [x] HDRI environment lighting with preset selector (studio, city, sunset, etc.)
- [x] Contact shadows for grounded object appearance
- [x] ACES Filmic tone mapping + sRGB color space + antialiasing
- [x] SSAO ambient occlusion + bloom (with HD Rendering toggle)
- [x] Default lighting rebalanced for HDRI (lower ambient/directional intensity)
- [x] Background color setup via Three.js scene.background
```
