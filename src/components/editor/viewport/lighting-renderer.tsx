"use client";

import { useEditorStore } from "@/store/editor-store";

/**
 * Renders lights from the editor store's lighting config.
 */
export function LightingRenderer() {
  const lighting = useEditorStore((s) => s.scene.lighting);

  return (
    <>
      <ambientLight
        color={lighting.ambientLight.color}
        intensity={lighting.ambientLight.intensity}
      />
      {lighting.directionalLights.map((light) => (
        <directionalLight
          key={light.id}
          color={light.color}
          intensity={light.intensity}
          position={light.position}
          castShadow={light.castShadow}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
      ))}
      {lighting.pointLights.map((light) => (
        <pointLight
          key={light.id}
          color={light.color}
          intensity={light.intensity}
          position={light.position}
          distance={light.distance}
          decay={light.decay}
        />
      ))}
    </>
  );
}
