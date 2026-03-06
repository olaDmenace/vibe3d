"use client";

import { useEditorStore } from "@/store/editor-store";
import { Grid, Environment, ContactShadows } from "@react-three/drei";

/**
 * Sets up the environment: HDRI lighting, contact shadows, grid, background color.
 */
export function EnvironmentSetup() {
  const environment = useEditorStore((s) => s.scene.environment);
  const hdriPreset = useEditorStore((s) => s.hdriPreset);

  const bgColor = environment.backgroundColor;

  return (
    <>
      <color attach="background" args={[bgColor]} />

      <Environment
        preset={hdriPreset as "studio"}
        background={false}
        environmentIntensity={0.8}
      />

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
