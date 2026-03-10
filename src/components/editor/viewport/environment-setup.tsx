"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useEditorStore } from "@/store/editor-store";
import { Grid, ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

/* ------------------------------------------------------------------ */
/*  Procedural environment map — no CDN fetch, no network dependency   */
/* ------------------------------------------------------------------ */

/** Color palettes for each HDRI-like preset */
const PRESET_COLORS: Record<string, { top: string; mid: string; bottom: string; intensity: number }> = {
  studio:    { top: "#b0b8c8", mid: "#d8dce6", bottom: "#6e7280", intensity: 0.8 },
  city:      { top: "#87aacc", mid: "#c8d4e0", bottom: "#8c8878", intensity: 0.7 },
  sunset:    { top: "#2a1f3a", mid: "#c06040", bottom: "#e8a060", intensity: 0.9 },
  dawn:      { top: "#4a5a78", mid: "#d09070", bottom: "#c8a888", intensity: 0.6 },
  night:     { top: "#0a0a1a", mid: "#1a1a30", bottom: "#101020", intensity: 0.3 },
  warehouse: { top: "#a09888", mid: "#c8c0b0", bottom: "#807868", intensity: 0.7 },
  forest:    { top: "#5a7a58", mid: "#8aaa80", bottom: "#3a5a30", intensity: 0.6 },
  apartment: { top: "#c8c0b8", mid: "#e0d8d0", bottom: "#a09890", intensity: 0.7 },
  lobby:     { top: "#b8b0a8", mid: "#d8d0c8", bottom: "#988878", intensity: 0.7 },
  park:      { top: "#78a8d0", mid: "#b0c8a0", bottom: "#608040", intensity: 0.7 },
};

function createGradientEnvMap(preset: string): THREE.CubeTexture {
  const colors = PRESET_COLORS[preset] || PRESET_COLORS.studio;
  const size = 64;

  const topColor = new THREE.Color(colors.top);
  const midColor = new THREE.Color(colors.mid);
  const bottomColor = new THREE.Color(colors.bottom);

  function createFaceData(faceDir: "px" | "nx" | "py" | "ny" | "pz" | "nz"): Uint8Array {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      // Map y to vertical gradient (0 = top, 1 = bottom)
      let t: number;
      if (faceDir === "py") t = 0;       // top face = top color
      else if (faceDir === "ny") t = 1;   // bottom face = bottom color
      else t = y / (size - 1);            // side faces = gradient

      const color = new THREE.Color();
      if (t < 0.5) {
        color.lerpColors(topColor, midColor, t * 2);
      } else {
        color.lerpColors(midColor, bottomColor, (t - 0.5) * 2);
      }

      const idx = y * size * 4;
      for (let x = 0; x < size; x++) {
        const px = idx + x * 4;
        data[px] = Math.round(color.r * 255);
        data[px + 1] = Math.round(color.g * 255);
        data[px + 2] = Math.round(color.b * 255);
        data[px + 3] = 255;
      }
    }
    return data;
  }

  const faces: ("px" | "nx" | "py" | "ny" | "pz" | "nz")[] = ["px", "nx", "py", "ny", "pz", "nz"];
  const cubeTexture = new THREE.CubeTexture(faces.map((face) => {
    const data = createFaceData(face);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(size, size);
    imgData.data.set(data);
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }));

  cubeTexture.needsUpdate = true;
  return cubeTexture;
}

/**
 * Applies the procedural environment map to the scene.
 */
function ProceduralEnvironment({ preset }: { preset: string }) {
  const { scene } = useThree();
  const colors = PRESET_COLORS[preset] || PRESET_COLORS.studio;

  const envMap = useMemo(() => {
    const texture = createGradientEnvMap(preset);
    return texture;
  }, [preset]);

  useMemo(() => {
    scene.environment = envMap;
    scene.environmentIntensity = colors.intensity;
    return () => {
      if (scene.environment === envMap) {
        scene.environment = null;
      }
    };
  }, [scene, envMap, colors.intensity]);

  return null;
}

/**
 * Sets up the environment: procedural lighting, contact shadows, grid, background color.
 */
export function EnvironmentSetup() {
  const environment = useEditorStore((s) => s.scene.environment);
  const hdriPreset = useEditorStore((s) => s.hdriPreset);

  const bgColor = environment.backgroundColor;

  return (
    <>
      <color attach="background" args={[bgColor]} />

      <ProceduralEnvironment preset={hdriPreset} />

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={20}
        blur={2.5}
        far={10}
        color="#000000"
      />

      {environment.showGrid && (
        <Grid
          args={[environment.gridSize, environment.gridSize]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#333344"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#444466"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />
      )}
    </>
  );
}
