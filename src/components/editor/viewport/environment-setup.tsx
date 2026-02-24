"use client";

import { useEditorStore } from "@/store/editor-store";
import { Grid } from "@react-three/drei";

/**
 * Sets up the environment: grid, background color.
 */
export function EnvironmentSetup() {
  const environment = useEditorStore((s) => s.scene.environment);

  return (
    <>
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
