"use client";

import { Component, Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { useEditorStore } from "@/store/editor-store";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { SceneObject } from "@/types/scene";

/** Error boundary for GLB loading failures (expired URLs, network errors) */
class GLBErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[GLBErrorBoundary] Model load failed:", error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#885555" wireframe />
        </mesh>
      );
    }
    return this.props.children;
  }
}

/**
 * Check if an assetId refers to a primitive shape.
 * Primitives: "cube", "sphere", "plane", "cylinder", "cone", "torus"
 * or prefixed: "primitive:cube", "primitive:sphere", etc.
 */
const PRIMITIVES = new Set(["cube", "sphere", "plane", "cylinder", "cone", "torus"]);

function isPrimitive(assetId: string): boolean {
  if (PRIMITIVES.has(assetId)) return true;
  if (assetId.startsWith("primitive:")) {
    return PRIMITIVES.has(assetId.slice("primitive:".length));
  }
  return false;
}

function getPrimitiveType(assetId: string): string {
  if (assetId.startsWith("primitive:")) return assetId.slice("primitive:".length);
  return assetId;
}

/**
 * Renders all objects from the editor store.
 * Supports both primitives and loaded GLB models.
 */
export function SceneRenderer() {
  const objects = useEditorStore((s) => s.scene.objects);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);

  return (
    <>
      {Object.values(objects).map((obj) => {
        if (!obj.visible) return null;

        const isSelected = obj.id === selectedObjectId;

        return (
          <SceneObjectGroup key={obj.id} obj={obj} isSelected={isSelected} />
        );
      })}
    </>
  );
}

/**
 * Wraps each scene object in a group and imperatively syncs transforms.
 * This avoids conflicts with TransformControls which mutates the Three.js
 * object directly — declarative props would fight with it.
 */
function SceneObjectGroup({
  obj,
  isSelected,
}: {
  obj: SceneObject;
  isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Destructure transform arrays into individual numbers so React's
  // Object.is() dependency check catches value changes even when
  // Immer's structural sharing reuses the same array reference.
  const [px, py, pz] = obj.transform.position;
  const [rx, ry, rz] = obj.transform.rotation;
  const [sx, sy, sz] = obj.transform.scale;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.set(px, py, pz);
    group.rotation.set(rx, ry, rz);
    group.scale.set(sx, sy, sz);
  }, [px, py, pz, rx, ry, rz, sx, sy, sz]);

  return (
    <group
      ref={groupRef}
      userData={{ objectId: obj.id }}
    >
      {isPrimitive(obj.assetId) ? (
        <PrimitiveObject obj={obj} isSelected={isSelected} />
      ) : (
        <GLBErrorBoundary>
          <Suspense fallback={<LoadingPlaceholder />}>
            <GLBObject obj={obj} isSelected={isSelected} />
          </Suspense>
        </GLBErrorBoundary>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Primitive rendering (cube, sphere, etc.)                           */
/* ------------------------------------------------------------------ */

function PrimitiveObject({
  obj,
  isSelected,
}: {
  obj: SceneObject;
  isSelected: boolean;
}) {
  const material = obj.materialOverrides[0];
  const color = material?.color ?? "#888888";
  const metalness = material?.metalness ?? 0;
  const roughness = material?.roughness ?? 0.5;
  const opacity = material?.opacity ?? 1;
  const type = getPrimitiveType(obj.assetId);

  return (
    <>
      <mesh castShadow receiveShadow>
        <PrimitiveGeometry type={type} />
        <meshStandardMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      {isSelected && (
        <mesh>
          <PrimitiveGeometry type={type} />
          <meshBasicMaterial
            color="#6366f1"
            wireframe
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </>
  );
}

function PrimitiveGeometry({ type }: { type: string }) {
  switch (type) {
    case "sphere":
      return <sphereGeometry args={[0.5, 32, 32]} />;
    case "plane":
      return <planeGeometry args={[1, 1]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
    case "cone":
      return <coneGeometry args={[0.5, 1, 32]} />;
    case "torus":
      return <torusGeometry args={[0.4, 0.15, 16, 32]} />;
    case "cube":
    default:
      return <boxGeometry args={[1, 1, 1]} />;
  }
}

/* ------------------------------------------------------------------ */
/*  GLB model rendering                                                */
/* ------------------------------------------------------------------ */

function GLBObject({
  obj,
  isSelected,
}: {
  obj: SceneObject;
  isSelected: boolean;
}) {
  // The modelUrl may be stored in metadata (for generated models)
  // or we need to resolve it via the asset API
  const modelUrl = (obj.metadata?.modelUrl as string) ?? null;

  if (!modelUrl) {
    // Fallback: show a placeholder box for models without URLs
    return (
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#555" wireframe />
      </mesh>
    );
  }

  return <GLBModelFromUrl url={modelUrl} obj={obj} isSelected={isSelected} />;
}

function GLBModelFromUrl({
  url,
  obj,
  isSelected,
}: {
  url: string;
  obj: SceneObject;
  isSelected: boolean;
}) {
  const { scene } = useGLTF(url);
  const highlightedMeshName = useEditorStore((s) => s.highlightedMeshName);

  // Track the previous clone so we can dispose its materials on change
  const previousCloneRef = useRef<THREE.Object3D | null>(null);

  // On first load, extract mesh names into metadata so AI knows about them
  const meshNamesExtracted = useRef(false);
  useEffect(() => {
    if (meshNamesExtracted.current) return;
    meshNamesExtracted.current = true;
    const names: string[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name) {
        names.push(child.name);
      }
    });
    if (names.length > 0) {
      const currentObj = useEditorStore.getState().scene.objects[obj.id];
      if (currentObj && !currentObj.metadata?.meshNames) {
        useEditorStore.setState((state) => {
          const o = state.scene.objects[obj.id];
          if (o) {
            o.metadata = { ...o.metadata, meshNames: names };
          }
        });
      }
    }
  }, [scene, obj.id]);

  // Dispose materials on unmount
  useEffect(() => {
    return () => {
      if (previousCloneRef.current) {
        previousCloneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            for (const mat of materials) {
              mat.dispose();
            }
          }
        });
      }
    };
  }, []);

  // Clone scene and apply material overrides + shadows
  // Re-clones when overrides change so we never mutate the cached original
  const cloned = useMemo(() => {
    // Dispose materials from the previous clone
    if (previousCloneRef.current) {
      previousCloneRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of materials) {
            mat.dispose();
          }
        }
      });
    }

    const clone = scene.clone();

    // Build lookup: meshName → override, plus a fallback for unnamed (global) overrides
    const byMeshName = new Map<string, typeof obj.materialOverrides[0]>();
    let globalOverride: typeof obj.materialOverrides[0] | null = null;

    for (const override of obj.materialOverrides) {
      if (override.meshName) {
        byMeshName.set(override.meshName, override);
      } else {
        globalOverride = override;
      }
    }

    clone.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.castShadow = true;
      child.receiveShadow = true;

      // Find the most specific override: meshName match first, then global fallback
      const override = byMeshName.get(child.name) ?? globalOverride;
      if (!override) return;

      // Clone material to avoid mutating the cached original
      if (child.material instanceof THREE.MeshStandardMaterial) {
        child.material = child.material.clone();
        if (override.color) child.material.color.set(override.color);
        if (override.metalness !== undefined) child.material.metalness = override.metalness;
        if (override.roughness !== undefined) child.material.roughness = override.roughness;
        if (override.opacity !== undefined) {
          child.material.opacity = override.opacity;
          child.material.transparent = override.opacity < 1;
        }
      }
    });

    previousCloneRef.current = clone;
    return clone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, obj.materialOverrides]);

  // Click handler to identify individual mesh parts within a selected model
  const handleMeshClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!isSelected) return;
      const clickedMesh = event.object;
      if (clickedMesh instanceof THREE.Mesh && clickedMesh.name) {
        const meshNames = (obj.metadata?.meshNames as string[]) ?? [];
        if (meshNames.includes(clickedMesh.name)) {
          const current = useEditorStore.getState().highlightedMeshName;
          useEditorStore.setState({
            highlightedMeshName: current === clickedMesh.name ? null : clickedMesh.name,
          });
          event.stopPropagation();
        }
      }
    },
    [isSelected, obj.metadata?.meshNames]
  );

  return (
    <>
      <primitive object={cloned} onClick={handleMeshClick} />
      {isSelected && !highlightedMeshName && (
        <SelectionOverlay scene={scene} />
      )}
      {isSelected && highlightedMeshName && (
        <MeshHighlight scene={scene} meshName={highlightedMeshName} />
      )}
    </>
  );
}

function SelectionOverlay({ scene }: { scene: THREE.Object3D }) {
  const { size, center } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const s = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    return { size: s, center: c };
  }, [scene]);

  return (
    <mesh position={[center.x, center.y, center.z]}>
      <boxGeometry args={[size.x * 1.02, size.y * 1.02, size.z * 1.02]} />
      <meshBasicMaterial
        color="#6366f1"
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Mesh-level highlight (amber wireframe around a single mesh)        */
/* ------------------------------------------------------------------ */

function MeshHighlight({
  scene,
  meshName,
}: {
  scene: THREE.Object3D;
  meshName: string;
}) {
  const { size, center } = useMemo(() => {
    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === meshName) {
        targetMesh = child;
      }
    });

    if (!targetMesh) {
      const box = new THREE.Box3().setFromObject(scene);
      return {
        size: box.getSize(new THREE.Vector3()),
        center: box.getCenter(new THREE.Vector3()),
      };
    }

    const box = new THREE.Box3().setFromObject(targetMesh);
    return {
      size: box.getSize(new THREE.Vector3()),
      center: box.getCenter(new THREE.Vector3()),
    };
  }, [scene, meshName]);

  return (
    <mesh position={[center.x, center.y, center.z]}>
      <boxGeometry args={[size.x * 1.05, size.y * 1.05, size.z * 1.05]} />
      <meshBasicMaterial
        color="#f59e0b"
        wireframe
        transparent
        opacity={0.5}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading placeholder                                                */
/* ------------------------------------------------------------------ */

function LoadingPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#444" wireframe transparent opacity={0.5} />
    </mesh>
  );
}
