"use client";

import { Suspense } from "react";
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
          <group
            key={obj.id}
            position={obj.transform.position}
            rotation={new THREE.Euler(...obj.transform.rotation)}
            scale={obj.transform.scale}
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
      })}
    </>
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

  // Apply material overrides if any
  const material = obj.materialOverrides[0];
  if (material) {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (material.color) child.material.color.set(material.color);
        if (material.metalness !== undefined) child.material.metalness = material.metalness;
        if (material.roughness !== undefined) child.material.roughness = material.roughness;
        if (material.opacity !== undefined) {
          child.material.opacity = material.opacity;
          child.material.transparent = material.opacity < 1;
        }
      }
    });
  }

  // Enable shadows
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <>
      <primitive object={scene.clone()} />
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
