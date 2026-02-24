"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import { SceneRenderer } from "./scene-renderer";
import { EnvironmentSetup } from "./environment-setup";
import { LightingRenderer } from "./lighting-renderer";
import { TransformGizmo } from "./transform-gizmo";
import { useEditorStore } from "@/store/editor-store";

export function EditorViewport() {
  const camera = useEditorStore((s) => s.scene.camera);
  const dispatch = useEditorStore((s) => s.dispatch);

  const handlePointerMissed = () => {
    dispatch({ type: "SELECT_OBJECT", id: null });
  };

  return (
    <div className="relative h-full w-full bg-editor-viewport-bg">
      <Canvas
        shadows
        camera={{
          position: camera.position,
          fov: camera.fov,
          near: camera.near,
          far: camera.far,
        }}
        onPointerMissed={handlePointerMissed}
      >
        <Suspense fallback={null}>
          <LightingRenderer />
          <EnvironmentSetup />
          <ClickableScene />
          <TransformGizmo />
          <OrbitControls makeDefault target={camera.target} />
        </Suspense>
      </Canvas>
    </div>
  );
}

/**
 * Wraps SceneRenderer with click handling for object selection.
 */
function ClickableScene() {
  const dispatch = useEditorStore((s) => s.dispatch);

  return (
    <group
      onPointerDown={(e) => {
        // Walk up to find objectId in userData
        let current = e.object as THREE.Object3D | null;
        while (current) {
          if (current.userData?.objectId) {
            e.stopPropagation();
            dispatch({
              type: "SELECT_OBJECT",
              id: current.userData.objectId,
            });
            return;
          }
          current = current.parent;
        }
      }}
    >
      <SceneRenderer />
    </group>
  );
}
