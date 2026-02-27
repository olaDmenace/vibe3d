"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useEditorStore } from "@/store/editor-store";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { SceneObject } from "@/types/scene";

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

  // Imperatively sync transforms from store → Three.js object
  // This works correctly even when TransformControls is attached
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.set(...obj.transform.position);
    group.rotation.set(...obj.transform.rotation);
    group.scale.set(...obj.transform.scale);
  }, [obj.transform.position, obj.transform.rotation, obj.transform.scale]);

  return (
    <group
      ref={groupRef}
      userData={{ objectId: obj.id }}
    >
      {isPrimitive(obj.assetId) ? (
        <PrimitiveObject obj={obj} isSelected={isSelected} />
      ) : (
        <Suspense fallback={<LoadingPlaceholder />}>
          <GLBObject obj={obj} isSelected={isSelected} />
        </Suspense>
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

  // Clone scene and apply material overrides + shadows
  // Re-clones when overrides change so we never mutate the cached original
  const cloned = useMemo(() => {
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

    return clone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, obj.materialOverrides]);

  return (
    <>
      <primitive object={cloned} />
      {isSelected && (
        <SelectionOverlay scene={scene} />
      )}
    </>
  );
}

function SelectionOverlay({ scene }: { scene: THREE.Object3D }) {
  // Compute bounding box for wireframe selection indicator
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

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
