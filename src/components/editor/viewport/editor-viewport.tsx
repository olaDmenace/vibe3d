"use client";

import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useState, useEffect } from "react";
import { EffectComposer, N8AO, Bloom } from "@react-three/postprocessing";
import { SceneRenderer } from "./scene-renderer";
import { EnvironmentSetup } from "./environment-setup";
import { LightingRenderer } from "./lighting-renderer";
import { TransformGizmo } from "./transform-gizmo";
import { CameraManager } from "./camera-manager";
import { useEditorStore } from "@/store/editor-store";

export function EditorViewport() {
  const camera = useEditorStore((s) => s.scene.camera);
  const dispatch = useEditorStore((s) => s.dispatch);
  const enablePostProcessing = useEditorStore(
    (s) => s.enablePostProcessing
  );

  const handlePointerMissed = () => {
    dispatch({ type: "SELECT_OBJECT", id: null });
  };

  return (
    <div className="relative h-full w-full bg-[#262624]">
      <Canvas
        shadows
        gl={{
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          outputColorSpace: THREE.SRGBColorSpace,
          antialias: true,
        }}
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
          <CameraManager />
          {enablePostProcessing && <DeferredPostProcessing />}
        </Suspense>
      </Canvas>
    </div>
  );
}

/**
 * Defers EffectComposer mount until the GL context is fully initialized.
 * Waits for the renderer to complete its first render pass so the
 * render target exists before postprocessing reads from it.
 */
function DeferredPostProcessing() {
  const gl = useThree((s) => s.gl);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!gl) return;

    // Wait multiple frames to ensure the renderer has fully initialized
    // its render targets (single rAF is not always enough).
    let frame = 0;
    let id: number;
    function wait() {
      frame++;
      if (frame >= 3) {
        setReady(true);
      } else {
        id = requestAnimationFrame(wait);
      }
    }
    id = requestAnimationFrame(wait);
    return () => cancelAnimationFrame(id);
  }, [gl]);

  if (!ready) return null;

  return (
    <EffectComposer>
      <N8AO intensity={2} aoRadius={0.5} distanceFalloff={0.5} />
      <Bloom
        luminanceThreshold={0.9}
        luminanceSmoothing={0.025}
        intensity={0.3}
      />
    </EffectComposer>
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
