"use client";

import { useEditorStore } from "@/store/editor-store";
import * as THREE from "three";

/**
 * Renders all objects from the editor store as primitives.
 * Phase 1 supports cube, sphere, plane, and cylinder primitives.
 */
export function SceneRenderer() {
  const objects = useEditorStore((s) => s.scene.objects);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);

  return (
    <>
      {Object.values(objects).map((obj) => {
        if (!obj.visible) return null;

        const isSelected = obj.id === selectedObjectId;
        const material = obj.materialOverrides[0];
        const color = material?.color ?? "#888888";
        const metalness = material?.metalness ?? 0;
        const roughness = material?.roughness ?? 0.5;
        const opacity = material?.opacity ?? 1;

        return (
          <group
            key={obj.id}
            position={obj.transform.position}
            rotation={
              new THREE.Euler(...obj.transform.rotation)
            }
            scale={obj.transform.scale}
            userData={{ objectId: obj.id }}
          >
            <mesh castShadow receiveShadow>
              <PrimitiveGeometry type={obj.assetId} />
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
                <PrimitiveGeometry type={obj.assetId} />
                <meshBasicMaterial
                  color="#6366f1"
                  wireframe
                  transparent
                  opacity={0.3}
                />
              </mesh>
            )}
          </group>
        );
      })}
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
